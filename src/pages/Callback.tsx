import axios from "axios";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { API_ENDPOINT, LOGIN_URL } from "../const";

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const code = new URLSearchParams(location.search).get("code");
  const [, setCookie] = useCookies(["SaaSusRefreshToken"]);

  // JWTを取得してLocal Storageに保存
  const getToken = async () => {
    // JWT取得
    const res = await axios.get(`${API_ENDPOINT}/credentials?code=${code}`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
      withCredentials: true,
    });
    // JWTをLocal Storageに保存
    const idToken = res.data.id_token;
    localStorage.setItem("SaaSusIdToken", idToken);

    // リフレッシュトークンをCookieに保存
    const refreshToken = res.data.refresh_token;
    setCookie("SaaSusRefreshToken", refreshToken);
  };

  // ロールによって遷移先を振り分け
  const navigateByRole = async () => {
    // ロールの取得
    const jwtToken = window.localStorage.getItem("SaaSusIdToken");
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });
    const role = res.data.tenants[0].envs[0].roles[0].role_name;

    // ロールによって遷移先振り分け
    switch (role) {
      case "sadmin":
        navigate(`/sadmin/toppage?tenant_id=${res.data.tenants[0].id}`);
        break;
      case "admin":
        navigate(`/admin/toppage?tenant_id=${res.data.tenants[0].id}`);
        break;
      default:
        navigate(`/user/toppage?tenant_id=${res.data.tenants[0].id}`);
    }
  };

  // テナント一覧orユーザー一覧への遷移を判定
  const navigateIsMultiTenant = async () => {
    // userInfoの取得
    const jwtToken = window.localStorage.getItem("SaaSusIdToken");
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });

    const hasTenantLen = res.data.tenants.length;
    if (hasTenantLen > 1) {
      navigate("/tenants");
    } else {
      // シングルテナントであれば、ロールで遷移先を振り分け
      navigateByRole();
    }
  };

  useEffect(() => {
    const startCallback = async () => {
      if (code) {
        await getToken();
        navigateIsMultiTenant();
      } else {
        window.location.href = LOGIN_URL;
      }
    };

    startCallback();
  }, []);

  return <></>;
};

export default Callback;
