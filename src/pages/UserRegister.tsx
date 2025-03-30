import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";

const UserRegister = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState<any>();
  const [userAttributes, setUserAttributes] = useState<any>();
  const [userAttributeValues, setUserAttributeValues] = useState<any>();
  const navigate = useNavigate();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ユーザー属性情報を取得
  const GetUserAttributes = async () => {
    const res = await axios.get(`${API_ENDPOINT}/user_attributes`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
        "X-SaaSus-Referer": "GetUserAttributes",
      },
      withCredentials: true,
    });

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

  const handleAttributeChange = (key: string, value: any) => {
    setUserAttributeValues((prevValues: any) => ({
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
        {userAttributes &&
          Object.keys(userAttributes).map((key) => (
            <p key={key}>
              {userAttributes[key].display_name}：
              <input
                type={
                  userAttributes[key].attribute_type === "bool"
                    ? "checkbox"
                    : userAttributes[key].attribute_type === "date"
                    ? "date"
                    : userAttributes[key].attribute_type === "number"
                    ? "number"
                    : "text"
                }
                checked={
                  userAttributeValues &&
                  userAttributeValues[userAttributes[key].attribute_name]
                }
                value={
                  userAttributeValues &&
                  userAttributeValues[userAttributes[key].attribute_name]
                }
                onChange={(e) => {
                  const newValue =
                    e.target.type === "checkbox"
                      ? e.target.checked
                      : e.target.value;
                  handleAttributeChange(
                    userAttributes[key].attribute_name,
                    newValue
                  );
                }}
              />
            </p>
          ))}
        <button type="submit">登録</button>
      </form>
    </>
  );
};

export default UserRegister;
