import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate,useLocation } from "react-router-dom";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";
import {
  User,
  UserInfo,
  UserAttribute,
  Tenant,
  PlanInfo,
  UserAttributesResponse,
} from "../types";

// ユーザー属性の値を適切にフォーマットする関数
const formatAttributeValue = (value: any): string => {
  if (value === undefined || value === null) {
    return "　";
  }
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }
  if (value instanceof Date) {
    return value.toString();
  }
  return String(value);
};

const UserPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userinfo, setUserinfo] = useState<UserInfo | null>(null);
  const [userAttributes, setUserAttributes] = useState<
    Record<string, UserAttribute>
  >({});
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantUserInfo, setTenantUserInfo] = useState<Tenant | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [roleName, setRoleName] = useState<string>("");
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const location = useLocation();
  const pagePath = location.pathname;
  // ページ内で共通して使用するヘッダーを定義
  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${jwtToken}`,
    "X-SaaSus-Referer": pagePath, // すべてのAPIでこの共通のパスを使用
  };
  const getActionHeaders = (actionName: string) => {
    return {
      ...commonHeaders,
      "X-SaaSus-Referer": `${pagePath}?action=${actionName}`,
    };
  };
  // ユーザ一覧取得
  const getUsers = async (tenantId: string | null) => {
    if (!tenantId) return;

    const res = await axios.get<User[]>(`${API_ENDPOINT}/users`, {
      headers: commonHeaders,
      withCredentials: true,
      params: {
        tenant_id: tenantId,
      },
    });
    setUsers(res.data);
  };

  // ログインユーザの情報を取得
  const GetUserinfo = async (tenantId: string | null) => {
    if (!tenantId) return;

    const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
      headers: commonHeaders,
      withCredentials: true,
    });

    const tenant = res.data.tenants.find(
      (tenant: Tenant) => tenant.id === tenantId
    );

    if (tenant) {
      const planId = tenant.plan_id;
      const roleName = tenant.envs[0]?.roles[0]?.role_name || "";

      setTenantUserInfo(tenant);
      setRoleName(roleName);
      setUserinfo(res.data);

      if (planId !== null && planId !== undefined) {
        const plan = await axios.get<PlanInfo>(`${API_ENDPOINT}/pricing_plan`, {
          headers: commonHeaders,
          withCredentials: true,
          params: {
            plan_id: planId,
          },
        });
        setPlanInfo(plan.data);
      }
    }
  };

  // ユーザー属性情報を取得
  const GetUserAttributes = async () => {
    const res = await axios.get<UserAttributesResponse>(
      `${API_ENDPOINT}/user_attributes`,
      {
        headers: commonHeaders,
        withCredentials: true,
      }
    );
    setUserAttributes(res.data.user_attributes);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${API_ENDPOINT}/logout`,
        {},
        {
          headers: getActionHeaders("logout"),
          withCredentials: true,
        }
      );
      window.localStorage.removeItem("SaaSusIdToken");
      window.localStorage.removeItem("SaaSusRefreshToken");
      window.localStorage.removeItem("SaaSusAccessToken");

      const loginUrl = process.env.REACT_APP_LOGIN_URL || "/login";
      if (loginUrl.startsWith("http")) {
        window.location.href = loginUrl;
      } else {
        navigate(loginUrl);
      }
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
    }
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

  const handleDelete = async (userId: string) => {
    try {
      if (!tenantId) return;

      await axios.delete(`${API_ENDPOINT}/user_delete`, {
        headers: getActionHeaders("user_delete"),
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* ログインユーザー情報カード */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          ログインユーザーの情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <div className="mb-3">
              <span className="font-medium text-gray-600">テナント名：</span>
              <span>{tenantUserInfo?.name || "未設定"}</span>
            </div>
            <div className="mb-3">
              <span className="font-medium text-gray-600">名前：</span>
              <span>{tenantUserInfo?.user_attribute?.name || "未設定"}</span>
            </div>
            <div className="mb-3">
              <span className="font-medium text-gray-600">
                メールアドレス：
              </span>
              <span>{userinfo?.email || "未設定"}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-3">
              <span className="font-medium text-gray-600">ロール：</span>
              <span>
                {tenantUserInfo?.envs[0]?.roles[0]?.display_name || "未設定"}
              </span>
            </div>
            <div className="mb-3">
              <span className="font-medium text-gray-600">料金プランID：</span>
              <span>{tenantUserInfo?.plan_id || "未設定"}</span>
            </div>
            <div className="mb-3">
              <span className="font-medium text-gray-600">料金プラン名：</span>
              <span>{planInfo?.display_name || "未設定"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ユーザー一覧セクション */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          ユーザー一覧
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  テナントID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  UUID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  名前
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  メールアドレス
                </th>
                {userAttributes &&
                  Object.keys(userAttributes).map((key) => (
                    <th
                      key={key}
                      className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      {userAttributes[key].display_name}
                    </th>
                  ))}
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users?.map((user: User) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">{user.tenant_id}</td>
                  <td className="py-3 px-4">{user.id}</td>
                  <td className="py-3 px-4">{user.attributes?.name ?? "　"}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  {userAttributes &&
                    Object.keys(userAttributes).map((key) => {
                      const attribute = userAttributes[key];
                      const attributeValue =
                        user.attributes?.[attribute.attribute_name];
                      return (
                        <td
                          key={attribute.attribute_name}
                          className="py-3 px-4"
                        >
                          {formatAttributeValue(attributeValue)}
                        </td>
                      );
                    })}
                  <td className="py-3 px-4">
                    {tenantUserInfo &&
                      tenantUserInfo.envs &&
                      tenantUserInfo.envs[0]?.roles[0]?.role_name ===
                        "admin" && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="py-1 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          削除
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 管理者機能リンク */}
      {roleName === "admin" && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">管理機能</h2>
          <div className="space-y-3">
            <div>
              <a
                href={`/user_register?tenant_id=${tenantId}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                ユーザー新規登録
              </a>
            </div>
            <div>
              <a
                href={`/delete_user_log?tenant_id=${tenantId}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                ユーザー削除ログ
              </a>
            </div>
            <div className="flex items-start">
              <a
                href={`/user_invitation?tenant_id=${tenantId}`}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                ユーザー招待
              </a>
              <span className="ml-2 text-red-600 text-sm">
                ※ユーザー招待機能を利用するには、SaaSus Platform
                でドメイン名を設定し、DNS
                情報が検証され、正常に動作中になっている必要があります。
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ナビゲーションリンク */}
      <div className="mt-6 flex justify-between items-center">
        {/* テナント一覧に戻るリンク（複数テナントに所属している場合のみ表示） */}
        {userinfo && userinfo.tenants && userinfo.tenants.length > 1 && (
          <div>
            <a
              href="/tenants"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              テナント一覧に戻る
            </a>
          </div>
        )}
        
        {/* ログアウトボタン */}
        <div>
          <button
            onClick={handleLogout}
            className="py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
