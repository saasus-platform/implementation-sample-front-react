import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";


const SelfSignup = () => {
    const [userAttributes, setUserAttributes] = useState<any>();
    const [userAttributeValues, setUserAttributeValues] = useState<any>({});
    const [tenantName, setTenantName] = useState("");
    const [tenantAttributes, setTenantAttributes] = useState<any>();
    const [tenantAttributeValues, setTenantAttributeValues] = useState<any>({});
    const navigate = useNavigate();
	let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

    // ロールによって遷移先を振り分け
    const navigateByRole = async (userInfo: any) => {
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
        const res = await axios.get(`${API_ENDPOINT}/user_attributes`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Authorization: `Bearer ${jwtToken}`,
                "X-SaaSus-Referer": "GetUserAttributes",
            },
            withCredentials: true,
        });

        setUserAttributes(res.data.user_attributes);
    }
    // テナント属性情報を取得
    const GetTenantAttributes = async () => {
        const res = await axios.get(`${API_ENDPOINT}/tenant_attributes_list`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Authorization: `Bearer ${jwtToken}`,
                "X-SaaSus-Referer": "GetTenantAttributes",
            },
            withCredentials: true,
        });

        setTenantAttributes(res.data.tenant_attributes);
    }

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
            const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
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


    const handleAttributeChange = (key: string, value: any) => {
        setUserAttributeValues((prevValues: any) => ({
            ...prevValues,
            [key]: value,
        }));
    };
    const handleTenantAttributeChange = (key: string, value: any) => {
        setTenantAttributeValues((prevValues: any) => ({
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
                {tenantAttributes && (
                    <fieldset>
                        <legend>テナント属性</legend>
                        {Object.keys(tenantAttributes).map((key) => (
                            <p key={key}>
                                {tenantAttributes[key].display_name}：
                                <input
                                    type={
                                        tenantAttributes[key].attribute_type === "bool"
                                            ? "checkbox"
                                            : tenantAttributes[key].attribute_type === "date"
                                                ? "date"
                                                : tenantAttributes[key].attribute_type === "number"
                                                    ? "number"
                                                    : "text"
                                    }
                                    checked={
                                        tenantAttributeValues &&
                                        tenantAttributeValues[tenantAttributes[key].attribute_name]
                                    }
                                    value={
                                        tenantAttributeValues &&
                                        tenantAttributeValues[tenantAttributes[key].attribute_name]
                                    }
                                    onChange={(e) => {
                                        const newValue =
                                            e.target.type === "checkbox"
                                                ? e.target.checked
                                                : e.target.value;
                                        handleTenantAttributeChange(
                                            tenantAttributes[key].attribute_name,
                                            newValue
                                        );
                                    }}
                                />
                            </p>
                        ))}
                    </fieldset>
                )}

                {/* ユーザー属性セクション */}
                {userAttributes && (
                    <fieldset>
                        <legend>ユーザー属性</legend>
                        {Object.keys(userAttributes).map((key) => (
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
                    </fieldset>
                )}
                <button type="submit">サインアップ</button>
            </form>
        </>
    );
};

export default SelfSignup;
