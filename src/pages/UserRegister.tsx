import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

const LOGIN_URL = process.env.REACT_APP_LOGIN_URL ?? "";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";
const sleep = (second: number) =>
  new Promise((resolve) => setTimeout(resolve, second * 1000));

const UserRegister = () => {
	const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState<any>();
  const [userAttributes, setUserAttributes] = useState<any>();
  const [userAttributeValues, setUserAttributeValues] = useState<any>();
  const navigate = useNavigate();
	let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
	type Jwt = {
			[name: string]: string | number | boolean;
	};

	const idTokenCheck = async () => {
		const base64Url = jwtToken.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const decoded = JSON.parse(
				decodeURIComponent(escape(window.atob(base64)))
		) as Jwt;

		const expireDate = decoded["exp"] as number;
		const timestamp = parseInt(Date.now().toString().slice(0, 10));
		if (expireDate <= timestamp) {
			try {
				console.log("token expired");
				const res = await axios.get(`${API_ENDPOINT}/refresh`, {
					headers: {
							"X-Requested-With": "XMLHttpRequest",
					},
					withCredentials: true,
				});

				jwtToken = res.data.id_token;
				localStorage.setItem("SaaSusIdToken", jwtToken);

				await sleep(1);
				return;
			} catch (err) {
				console.log(err);
				window.location.href = LOGIN_URL;
			}
    }
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
			const startUserRegisterPage = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const tenantIdFromQuery = urlParams.get('tenant_id');
        setTenantId(tenantIdFromQuery);
        await idTokenCheck();
        GetuserAttributes();
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
              userAttributeValues
            },
          {
              headers: {
                  Authorization: `Bearer ${jwtToken}`,
                  "Content-Type": "application/json",
              },
              withCredentials: true,
          }
      );

      navigate(`/admin/toppage?tenant_id=${tenantId}`);
    } catch (error) {
      console.error("Error registering user:", error);
      // window.location.href = LOGIN_URL;
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
        <p>メールアドレス：
          <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
          />
        </p>
        <br />
        <p>パスワード：
        <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
        />
        </p>
        <br />
        {userAttributes && Object.keys(userAttributes).map((key) => (
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
              checked={userAttributeValues && userAttributeValues[userAttributes[key].attribute_name]}
              value={userAttributeValues && userAttributeValues[userAttributes[key].attribute_name]}
              onChange={(e) => {
                const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                handleAttributeChange(userAttributes[key].attribute_name, newValue);
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
