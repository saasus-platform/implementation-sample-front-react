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
    <p>
      {displayName}：
      <input
        type={inputType}
        checked={isBoolean ? value : undefined}
        value={!isBoolean ? value || "" : undefined}
        onChange={(e) => {
          const newValue =
            inputType === "checkbox" ? e.target.checked : e.target.value;
          onChange(attributeName, newValue);
        }}
      />
    </p>
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
    <>
      <form onSubmit={handleSubmit}>
        <p>
          メールアドレス：
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </p>
        <br />
        <p>
          パスワード：
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </p>
        <br />

        {/* ユーザー属性セクション */}
        {userAttributes && Object.keys(userAttributes).length > 0 && (
          <fieldset>
            <legend>ユーザー属性</legend>
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
          </fieldset>
        )}

        <button type="submit">登録</button>
      </form>
    </>
  );
};

export default UserRegister;
