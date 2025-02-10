import axios from "axios";
import { useEffect, useState } from "react";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";

const UserPage = () => {
  const [users, setUsers] = useState<any>();
  const [userinfo, setUserinfo] = useState<any>();
  const [userAttributes, setUserAttributes] = useState<any>();
  const [tenantId, setTenantId] = useState<any>();
  const [tenantUserInfo, setTenantUserInfo] = useState<any>();
  const [planInfo, setPlanInfo] = useState<any>();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ユーザ一覧取得
  const getUsers = async (tenantId: any) => {
    const res = await axios.get(`${API_ENDPOINT}/users`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
      params: {
        tenant_id: tenantId,
      },
    });
    setUsers(res.data);
  };

  // ログインユーザの情報を取得
  const GetUserinfo = async (tenantId: any) => {
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });

    const tenant = res.data.tenants.find(
      (tenant: any) => tenant.id === tenantId
    );
    const planId = tenant?.plan_id;
    setTenantUserInfo(tenant);
    setUserinfo(res.data);

    if (planId !== null && planId !== undefined) {
      const plan = await axios.get(`${API_ENDPOINT}/pricing_plan`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
        },
        withCredentials: true,
        params: {
          plan_id: planId,
        },
      });
      setPlanInfo(plan.data);
    }
  };

  // ユーザー属性情報を取得
  const GetUserAttributes = async () => {
    const res = await axios.get(`${API_ENDPOINT}/user_attributes`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });

    setUserAttributes(res.data.user_attributes);
  };

  useEffect(() => {
    const startUserPage = async () => {
      // テナントIDをクエリパラメータから取得
      const urlParams = new URLSearchParams(window.location.search);
      const tenantIdFromQuery = urlParams.get("tenant_id");
      setTenantId(tenantIdFromQuery);

      await idTokenCheck(jwtToken);
      getUsers(tenantIdFromQuery);
      GetUserinfo(tenantIdFromQuery);
      GetUserAttributes();
    };

    startUserPage();
  }, []);

  const handleDelete = async (userId: any) => {
    try {
      await axios.delete(`${API_ENDPOINT}/user_delete`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
        withCredentials: true,
        data: {
          tenantId: tenantId,
          userId: userId,
        },
      });

      getUsers(tenantId);
    } catch (error) {
      console.error("Error deleting user:", error);
      window.location.href = LOGIN_URL;
    }
  };

  return (
    <>
      ログインユーザの情報
      <br />
      テナント名：
      {tenantUserInfo?.name}
      <br />
      名前：
      {tenantUserInfo?.user_attribute.name}
      <br />
      メールアドレス：
      {userinfo?.email}
      <br />
      ロール：
      {tenantUserInfo?.envs[0].roles[0].display_name}
      <br />
      料金プランID：
      {tenantUserInfo?.plan_id ? tenantUserInfo.plan_id : "未設定"}
      <br />
      料金プラン名：
      {planInfo?.display_name ? planInfo.display_name : "未設定"}
      <br />
      <br />
      <br />
      <br />
      ユーザ一覧
      <table border={1} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <td>テナントID</td>
            <td>UUID</td>
            <td>名前</td>
            <td>メールアドレス</td>
            {userAttributes &&
              Object.keys(userAttributes).map((key) => (
                <td key={key}> {userAttributes[key].display_name}</td>
              ))}
            <td></td>
          </tr>
        </thead>
        <tbody>
          {users?.map((user: any) => (
            <tr key={user.id}>
              <td>{user.tenant_id}</td>
              <td>{user.id}</td>
              <td>{user.attributes?.name ?? "　"}</td>
              <td>{user.email}</td>
              {userAttributes?.map((attribute: any) => (
                <td key={attribute.attribute_name}>
                  {user.attributes && user.attributes[attribute.attribute_name]
                    ? typeof user.attributes[attribute.attribute_name] ===
                      "boolean"
                      ? user.attributes[attribute.attribute_name]
                        ? "True"
                        : "False"
                      : user.attributes[attribute.attribute_name]
                    : "　"}
                </td>
              ))}
              <td>
                {tenantUserInfo &&
                  tenantUserInfo.envs &&
                  tenantUserInfo.envs[0].roles[0].role_name === "admin" && (
                    <button onClick={() => handleDelete(user.id)}>削除</button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href={`/user_register?tenant_id=${tenantId}`}>ユーザー新規登録</a>
      <br />
      <a href={`/delete_user_log?tenant_id=${tenantId}`}>ユーザー削除ログ</a>
    </>
  );
};

export default UserPage;
