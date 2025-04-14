import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINT } from "../const";
import { idTokenCheck } from "../utils";
import { Tenant, UserInfo, TenantAttributesResponse } from "../types";

const TenantList = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  // tenantInfoの型をより具体的に修正
  const [tenantInfo, setTenantInfo] = useState<any[]>([]);
  const navigate = useNavigate();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ログインユーザの情報と所属テナント情報を取得
  const GetUserinfo = async () => {
    const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
        "X-SaaSus-Referer": "GetUserinfo",
      },
      withCredentials: true,
    });

    const tenantInfo = await Promise.all(
      res.data.tenants.map(async (tenant: Tenant) => {
        const res = await axios.get<TenantAttributesResponse>(
          `${API_ENDPOINT}/tenant_attributes`,
          {
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              Authorization: `Bearer ${jwtToken}`,
              "X-SaaSus-Referer": "GetTenantAttribute",
            },
            withCredentials: true,
            params: {
              tenant_id: tenant.id,
            },
          }
        );
        // API応答の構造に応じて適切なデータを返す
        return res.data.tenant_attributes || res.data;
      })
    );
    console.log(tenantInfo);
    setTenants(res.data.tenants);
    setTenantInfo(tenantInfo);
  };

  const handleUserListClick = async (tenantId: string) => {
    try {
      // ロールの取得
      const jwtToken = window.localStorage.getItem("SaaSusIdToken");
      const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetRole",
        },
        withCredentials: true,
      });

      const tenant = res.data.tenants.find(
        (tenant: Tenant) => tenant.id === tenantId
      );

      const role = tenant?.envs[0]?.roles[0]?.role_name || "";

      // リダイレクト
      switch (role) {
        case "sadmin":
          navigate(`/sadmin/toppage?tenant_id=${tenantId}`);
          break;
        case "admin":
          navigate(`/admin/toppage?tenant_id=${tenantId}`);
          break;
        default:
          navigate(`/user/toppage?tenant_id=${tenantId}`);
          break;
      }
    } catch (error) {
      console.error("Error fetching user list:", error);
    }
  };

  useEffect(() => {
    const startTenantListPage = async () => {
      await idTokenCheck(jwtToken);
      GetUserinfo();
    };
    startTenantListPage();
  }, []);

  return (
    <>
      テナント一覧
      <table border={1} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <td>テナントID</td>
            <td>テナント名</td>
            {tenantInfo &&
              tenantInfo.length > 0 &&
              Object.keys(tenantInfo[0]).map((key, index) => (
                <td key={index}>{tenantInfo[0][key].display_name}</td>
              ))}
            <td></td>
          </tr>
        </thead>
        <tbody>
          {tenants?.map((tenant: Tenant, tenantIndex: number) => {
            return (
              <tr key={tenant.id}>
                <td>{tenant.id}</td>
                <td>{tenant.name}</td>
                {tenantInfo[tenantIndex] &&
                  Object.keys(tenantInfo[tenantIndex]).map((key) => (
                    <td key={key}>
                      {tenantInfo[tenantIndex][
                        key
                      ].attribute_type.toLowerCase() === "bool"
                        ? tenantInfo[tenantIndex][key].value === true
                          ? "設定済み"
                          : "未設定"
                        : tenantInfo[tenantIndex][key].value}
                    </td>
                  ))}
                <td>
                  <button onClick={() => handleUserListClick(tenant.id)}>
                    ユーザ一覧に移動
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default TenantList;
