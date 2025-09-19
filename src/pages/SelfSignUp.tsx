import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";
import {
  UserAttribute,
  TenantAttribute,
  UserAttributeValues,
  TenantAttributeValues,
  UserAttributesResponse,
  TenantAttributesResponse,
  UserInfo,
} from "../types";

// 属性入力用の共通コンポーネント
interface AttributeInputProps {
  attributeName: string;
  displayName: string;
  attributeType: string;
  value: any;
  onChange: (name: string, value: any) => void;
}

const AttributeInput = ({
  attributeName,
  displayName,
  attributeType,
  value,
  onChange,
}: AttributeInputProps) => {
  // 属性タイプに基づいて適切な入力フィールドタイプを決定
  const inputType =
    attributeType === "bool"
      ? "checkbox"
      : attributeType === "date"
      ? "date"
      : attributeType === "number"
      ? "number"
      : "text";

  // boolean型の場合はcheckedプロパティを使用、それ以外はvalueプロパティを使用
  const isBoolean = typeof value === "boolean";

  return (
    <div className="mb-4">
      <label className="flex items-center">
        {inputType === "checkbox" ? (
          <>
            <input
              type="checkbox"
              checked={isBoolean ? value : undefined}
              onChange={(e) => onChange(attributeName, e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700">{displayName}</span>
          </>
        ) : (
          <>
            <span className="w-40 text-gray-700">{displayName}：</span>
            <input
              type={inputType}
              value={!isBoolean ? value || "" : undefined}
              onChange={(e) => onChange(attributeName, e.target.value)}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline flex-1"
            />
          </>
        )}
      </label>
    </div>
  );
};

const SelfSignup = () => {
  const [userAttributes, setUserAttributes] = useState<
    Record<string, UserAttribute>
  >({});
  const [userAttributeValues, setUserAttributeValues] =
    useState<UserAttributeValues>({});
  const [tenantName, setTenantName] = useState("");
  const [tenantAttributes, setTenantAttributes] = useState<
    Record<string, TenantAttribute>
  >({});
  const [tenantAttributeValues, setTenantAttributeValues] =
    useState<TenantAttributeValues>({});
  const navigate = useNavigate();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const location = useLocation();
  const pagePath = location.pathname;
  // ページ内で共通して使用するヘッダーを定義
  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${jwtToken}`,
    "X-SaaSus-Referer": pagePath, // すべてのAPIでこの共通のパスを使用
  };

  // ロールによって遷移先を振り分け
  const navigateByRole = async (userInfo: UserInfo) => {
    // ユーザーが1つのテナントにのみ所属している前提
    const tenant = userInfo.tenants[0]; // tenants[0] に直接アクセス
    if (!tenant) {
      console.error("No tenant found for the user");
      return;
    }

    const tenantId = tenant.id; // テナント ID を取得

    // ロール名を取得
    const role = tenant.envs[0]?.roles[0]?.role_name;
    if (!role) {
      console.error("Role not found for the user");
      return;
    }

    switch (role) {
      case "sadmin":
        navigate(`/sadmin/toppage?tenant_id=${tenantId}`);
        break;
      case "admin":
        navigate(`/admin/toppage?tenant_id=${tenantId}`);
        break;
      default:
        navigate(`/user/toppage?tenant_id=${tenantId}`);
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

  // テナント属性情報を取得
  const GetTenantAttributes = async () => {
    const res = await axios.get<TenantAttributesResponse>(
      `${API_ENDPOINT}/tenant_attributes_list`,
      {
        headers: commonHeaders,
        withCredentials: true,
      }
    );
    setTenantAttributes(res.data.tenant_attributes || {});
  };

  useEffect(() => {
    const startUserRegisterPage = async () => {
      await idTokenCheck(jwtToken);
      await Promise.all([GetUserAttributes(), GetTenantAttributes()]);
    };
    startUserRegisterPage();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // 空の値を除外したユーザー属性値を作成
    const filteredUserAttributeValues = Object.fromEntries(
      Object.entries(userAttributeValues).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === "string" && value.trim() === "") return false;
        if (typeof value === "number" && isNaN(value)) return false;
        return true;
      })
    );

    // 空の値を除外したテナント属性値を作成
    const filteredTenantAttributeValues = Object.fromEntries(
      Object.entries(tenantAttributeValues).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === "string" && value.trim() === "") return false;
        if (typeof value === "number" && isNaN(value)) return false;
        return true;
      })
    );

    const postHeaders = {
      ...commonHeaders,
      "X-SaaSus-Referer": `${pagePath}?action=self_sign_up`,
    };

    try {
      // セルフサインアップ処理
      await axios.post(
        `${API_ENDPOINT}/self_sign_up`,
        {
          tenantName,
          userAttributeValues: filteredUserAttributeValues,
          tenantAttributeValues: filteredTenantAttributeValues,
        },
        {
          headers: postHeaders,
          withCredentials: true,
        }
      );
      console.log("Self-signup succeeded");

      // ユーザー情報を取得してロールで遷移先を判断
      const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
        headers: commonHeaders,
        withCredentials: true,
      });
      const userInfo = res.data;
      await navigateByRole(userInfo);
    } catch (error) {
      console.error("Error during self-signup or navigation:", error);
      window.location.href = LOGIN_URL;
    }
  };

  const handleAttributeChange = (
    key: string,
    value: string | boolean | number | Date
  ) => {
    setUserAttributeValues((prevValues: UserAttributeValues) => ({
      ...prevValues,
      [key]: value,
    }));
  };

  const handleTenantAttributeChange = (
    key: string,
    value: string | boolean | number | Date
  ) => {
    setTenantAttributeValues((prevValues: TenantAttributeValues) => ({
      ...prevValues,
      [key]: value,
    }));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">サインアップ</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <label className="flex items-center">
              <span className="w-40 text-gray-700">テナント名：</span>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                required
                className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline flex-1"
              />
            </label>
          </div>

          {/* テナント属性セクション */}
          {tenantAttributes && Object.keys(tenantAttributes).length > 0 && (
            <div className="my-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
                テナント属性
              </h2>
              <div className="bg-gray-50 p-4 rounded-md">
                {Object.keys(tenantAttributes).map((key) => {
                  const attribute = tenantAttributes[key];
                  return (
                    <AttributeInput
                      key={key}
                      attributeName={attribute.attribute_name}
                      displayName={attribute.display_name}
                      attributeType={attribute.attribute_type}
                      value={tenantAttributeValues[attribute.attribute_name]}
                      onChange={handleTenantAttributeChange}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ユーザー属性セクション */}
          {userAttributes && Object.keys(userAttributes).length > 0 && (
            <div className="my-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
                ユーザー属性
              </h2>
              <div className="bg-gray-50 p-4 rounded-md">
                {Object.keys(userAttributes).map((key) => {
                  const attribute = userAttributes[key];
                  return (
                    <AttributeInput
                      key={key}
                      attributeName={attribute.attribute_name}
                      displayName={attribute.display_name}
                      attributeType={attribute.attribute_type}
                      value={userAttributeValues[attribute.attribute_name]}
                      onChange={handleAttributeChange}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
            >
              サインアップ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelfSignup;
