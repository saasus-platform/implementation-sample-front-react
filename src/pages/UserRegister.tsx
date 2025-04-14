import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";
import {
  UserAttribute,
  UserAttributeValues,
  UserAttributesResponse,
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
      <label
        className="block text-gray-700 text-sm font-bold mb-2"
        htmlFor={attributeName}
      >
        {displayName}
      </label>
      <input
        id={attributeName}
        type={inputType}
        checked={isBoolean ? value : undefined}
        value={!isBoolean ? value || "" : undefined}
        onChange={(e) => {
          const newValue =
            inputType === "checkbox" ? e.target.checked : e.target.value;
          onChange(attributeName, newValue);
        }}
        className={`${
          inputType === "checkbox"
            ? "form-checkbox h-5 w-5 text-blue-600"
            : "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        }`}
      />
    </div>
  );
};

const UserRegister = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userAttributes, setUserAttributes] = useState<
    Record<string, UserAttribute>
  >({});
  const [userAttributeValues, setUserAttributeValues] =
    useState<UserAttributeValues>({});
  const navigate = useNavigate();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ユーザー属性情報を取得
  const GetUserAttributes = async () => {
    const res = await axios.get<UserAttributesResponse>(
      `${API_ENDPOINT}/user_attributes`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetUserAttributes",
        },
        withCredentials: true,
      }
    );

    console.log(res.data.user_attributes);
    setUserAttributes(res.data.user_attributes);
  };

  useEffect(() => {
    const startUserRegisterPage = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantIdFromQuery = urlParams.get("tenant_id");
      setTenantId(tenantIdFromQuery);
      await idTokenCheck(jwtToken);
      GetUserAttributes();
    };

    startUserRegisterPage();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await axios.post(
        `${API_ENDPOINT}/user_register`,
        {
          email,
          password,
          tenantId,
          userAttributeValues,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
            "X-SaaSus-Referer": "handleSubmitUserRegist",
          },
          withCredentials: true,
        }
      );

      navigate(`/admin/toppage?tenant_id=${tenantId}`);
    } catch (error) {
      console.error("Error registering user:", error);
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">ユーザー登録</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* ユーザー属性セクション */}
          {userAttributes && Object.keys(userAttributes).length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
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

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              登録
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 text-center">
        <a
          href={`/admin/toppage?tenant_id=${tenantId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          ユーザー一覧に戻る
        </a>
      </div>
    </div>
  );
};

export default UserRegister;
