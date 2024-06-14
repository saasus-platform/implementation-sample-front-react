import axios from "axios";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";

const LOGIN_URL = process.env.REACT_APP_LOGIN_URL ?? "";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";
const sleep = (second: number) =>
  new Promise((resolve) => setTimeout(resolve, second * 1000));

const UserPage = () => {
  const [users, setUsers] = useState<any>();
  const [userinfo, setUserinfo] = useState<any>();
  const [userAttributes, setUserAttributes] = useState<any>();
  const [tenantId, setTenantId] = useState<any>();
  const [tenantUserInfo, setTenantUserInfo] = useState<any>();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const [cookies] = useCookies(["SaaSusRefreshToken"]);

  // JWT格納用型定義
  type Jwt = {
    [name: string]: string | number | boolean;
  };

  // JWTのアップデート処理
  const idTokenCheck = async () => {
    // JWTのデコード
    const base64Url = jwtToken.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      decodeURIComponent(escape(window.atob(base64)))
    ) as Jwt;

    // デコードしたJWTの有効期限チェック
    // JWTの有効期限が切れている場合は新しいトークンを取得する
    const expireDate = decoded["exp"] as number;
    const timestamp = parseInt(Date.now().toString().slice(0, 10));
    if (expireDate <= timestamp) {
      try {
        console.log("token expired");
        // リフレッシュトークンからJWT取得
        const res = await axios.get(`${API_ENDPOINT}/refresh`, {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
          withCredentials: true,
        });

        // JWTをLocal Storageに保存
        jwtToken = res.data.id_token;
        localStorage.setItem("SaaSusIdToken", jwtToken);

        // JWTを更新してすぐ使用すると、Token used before used エラーになるため。
        // ref: https://github.com/dgrijalva/jwt-go/issues/383
        await sleep(1);
        return;
      } catch (err) {
        console.log(err);
        window.location.href = LOGIN_URL;
      }
    }
  };

  // ユーザ一覧取得
  const getUsers = async (tenantId:any) => {
    const res = await axios.get(`${API_ENDPOINT}/users`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
      params: {
        tenant_id: tenantId
      }
    });
    setUsers(res.data);
  };

  // ログインユーザの情報を取得
  const GetUserinfo = async (tenantId:any) => {
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });

    res.data.tenants.map((tenant:any, index:any) => {
      if (tenant.id === tenantId) {
        setTenantUserInfo(tenant);
      }
    });

    setUserinfo(res.data);
  };

  // ユーザー属性情報を取得
  const GetuserAttributes = async () => {
    const res = await axios.get(`${API_ENDPOINT}/user_attributes`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });

    console.log(res.data.user_attributes)
    setUserAttributes(res.data.user_attributes);
  }

  useEffect(() => {
    const startUserPage = async () => {
      // テナントIDをクエリパラメータから取得
      const urlParams = new URLSearchParams(window.location.search);
      const tenantIdFromQuery = urlParams.get('tenant_id');
      setTenantId(tenantIdFromQuery);

      await idTokenCheck();
      getUsers(tenantIdFromQuery);
      GetUserinfo(tenantIdFromQuery);
      GetuserAttributes();
    };

    startUserPage();
  }, []);

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
      料金プラン：
      {tenantUserInfo?.plan_id ? tenantUserInfo.plan_id : "未設定"}
      <br />
      <br />
      <br />
      <br />
      ユーザ一覧
      <table border={1} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <td>テナントID</td>
            <td>UUID</td>
            <td>名前</td>
            <td>メールアドレス</td>
            {userAttributes && Object.keys(userAttributes).map((key) => (
              <td key={key}> {userAttributes[key].display_name}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {users?.map((user: any) => {
            return (
              <tr key={user.id}>
                <td>{user.tenant_name}</td>
                <td>{user.id}</td>
                <td>{user.attributes.name}</td>
                <td>{user.email}</td>
                {user.attributes && Object.keys(user.attributes).map((key, index) => (
                  <td key={index}>
                    {typeof user.attributes[key] === "boolean"
                      ? user.attributes[key] ? "True" : "False"
                      : user.attributes[key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default UserPage;
