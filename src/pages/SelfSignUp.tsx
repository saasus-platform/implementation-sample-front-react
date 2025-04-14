import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetUserAttributes",
        },
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
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetTenantAttributes",
        },
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
    try {
      // セルフサインアップ処理
      await axios.post(
        `${API_ENDPOINT}/self_sign_up`,
        {
          tenantName,
          userAttributeValues,
          tenantAttributeValues,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
            "X-SaaSus-Referer": "handleSubmitSelfSignUp",
          },
          withCredentials: true,
        }
      );
      console.log("Self-signup succeeded");
      // ユーザー情報を取得してロールで遷移先を判断
      const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetUserInfo",
        },
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
    <>
      <form onSubmit={handleSubmit}>
        <p>
          テナント名：
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            required
          />
        </p>
        <br />

        {/* テナント属性セクション */}
        {tenantAttributes && Object.keys(tenantAttributes).length > 0 && (
          <fieldset>
            <legend>テナント属性</legend>
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
          </fieldset>
        )}

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

        <button type="submit">サインアップ</button>
      </form>
    </>
  );
};

export default SelfSignup;
