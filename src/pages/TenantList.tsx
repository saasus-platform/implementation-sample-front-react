import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINT } from "../const";
import { idTokenCheck } from "../utils";
import { Tenant, UserInfo, TenantAttributesResponse } from "../types";

// テナント属性の値を適切にフォーマットする関数
const formatTenantAttributeValue = (
  value: any,
  attributeType: string
): string => {
  if (value === undefined || value === null) {
    return "　";
  }

  // Bool型の場合は「設定済み」「未設定」で表示
  if (attributeType.toLowerCase() === "bool") {
    return value === true ? "設定済み" : "未設定";
  }

  // 日付型の場合
  if (value instanceof Date) {
    return value.toString();
  }

  return String(value);
};

const TenantList = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
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
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">テナント一覧</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  テナントID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  テナント名
                </th>
                {tenantInfo?.length > 0 &&
                  Object.keys(tenantInfo[0] || {}).map((key) => (
                    <th
                      key={key}
                      className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      {tenantInfo[0][key].display_name}
                    </th>
                  ))}
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants?.map((tenant: Tenant, tenantIndex: number) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 whitespace-nowrap">{tenant.id}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{tenant.name}</td>
                  {tenantInfo[tenantIndex] &&
                    Object.keys(tenantInfo[tenantIndex] || {}).map((key) => {
                      const attribute = tenantInfo[tenantIndex][key];
                      return (
                        <td key={key} className="py-3 px-4 whitespace-nowrap">
                          {formatTenantAttributeValue(
                            attribute.value,
                            attribute.attribute_type
                          )}
                        </td>
                      );
                    })}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleUserListClick(tenant.id)}
                      className="py-1 px-3 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      ユーザー一覧に移動
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TenantList;
