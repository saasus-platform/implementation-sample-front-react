import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { API_ENDPOINT } from "../const";
import { consumePkceCodeVerifier, redirectToLogin } from "../pkce";

const Callback = () => {
  const location = useLocation();
  const pagePath = location.pathname;
  const navigate = useNavigate();
  const code = new URLSearchParams(location.search).get("code");
  const [, setCookie] = useCookies(["SaaSusRefreshToken"]);
  const [errorMessage, setErrorMessage] = useState("");

  // 一時コード + code_verifier を送信してJWTを取得し、Local Storageに保存
  const getToken = async (temporaryCode: string, codeVerifier: string) => {
    // PKCE: 一時コードと code_verifier を POST して認証情報へ交換
    const res = await axios.post(
      `${API_ENDPOINT}/credentials`,
      {
        code: temporaryCode,
        code_verifier: codeVerifier,
      },
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        withCredentials: true,
      }
    );
    // JWTをLocal Storageに保存
    const idToken = res.data.id_token;
    localStorage.setItem("SaaSusIdToken", idToken);

    // アクセストークンをLocal Storageに保存
    const accessToken = res.data.access_token;
    localStorage.setItem("SaaSusAccessToken", accessToken);

    // リフレッシュトークンをCookieに保存
    const refreshToken = res.data.refresh_token;
    setCookie("SaaSusRefreshToken", refreshToken);
  };

  // ロールによって遷移先を振り分け
  const navigateByRole = async () => {
    // ロールの取得
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-SaaSus-Referer": pagePath,
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

  // 遷移先判定
  const handleUserNavigation = async () => {
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-SaaSus-Referer": pagePath,
      },
      withCredentials: true,
    });

    const hasTenantLen = res.data.tenants.length;

    if (hasTenantLen === 0) {
      // ユーザーがテナントに紐づいていない場合、セルフサインアップ画面へ遷移
      navigate("/self_sign_up");
    } else if (hasTenantLen > 1) {
      navigate("/tenants");
    } else {
      // シングルテナントであれば、ロールで遷移先を振り分け
      navigateByRole();
    }
  };

  useEffect(() => {
    const startCallback = async () => {
      // 保持していた code_verifier を取り出す（取り出し後は破棄される）
      const codeVerifier = consumePkceCodeVerifier();

      // 一時コードまたは code_verifier が無ければ、challengeを付け直してログインへ
      if (!code || !codeVerifier) {
        await redirectToLogin();
        return;
      }

      try {
        await getToken(code, codeVerifier);
      } catch (error) {
        // 401（PKCE検証失敗など）はエラー表示、それ以外はログインへ戻す
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setErrorMessage("認証エラー");
          return;
        }
        await redirectToLogin();
        return;
      }

      try {
        await handleUserNavigation();
      } catch {
        await redirectToLogin();
      }
    };

    void startCallback();
  }, []);

  if (!errorMessage) {
    return <></>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div
        role="alert"
        className="max-w-xl rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-700 shadow-sm"
      >
        {errorMessage}
      </div>
    </main>
  );
};

export default Callback;
