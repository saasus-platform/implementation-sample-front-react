import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { API_ENDPOINT } from "../const";
import { consumePkceCodeVerifier } from "../pkce";
import { saveAuthFlow, startLogin } from "../authFlow";

const Callback = () => {
  const location = useLocation();
  const pagePath = location.pathname;
  const navigate = useNavigate();
  const code = new URLSearchParams(location.search).get("code");
  const [, setCookie] = useCookies(["SaaSusRefreshToken"]);
  const [errorMessage, setErrorMessage] = useState("");

  // 一時コード（+ code_verifier）を送信してJWTを取得し、保存する
  // code_verifier あり → POST /credentials（PKCE）
  // code_verifier なし → GET /credentials?code=...（従来方式）
  //
  // 【サンプルアプリ固有】通常ログインと PKCE の両方を試せるよう、
  // code_verifier の有無で送信方法を切り替えている。実際のアプリでは
  // 採用した方式に応じて、どちらか一方だけを実装すればよい。
  const getToken = async (
    temporaryCode: string,
    codeVerifier: string | null
  ) => {
    const res = codeVerifier
      ? await axios.post(
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
        )
      : await axios.get(`${API_ENDPOINT}/credentials`, {
          params: { code: temporaryCode },
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
          withCredentials: true,
        });
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
      // 保存した code_verifier を取り出す（取り出すと同時に破棄される）
      // code_verifier があれば PKCE 方式、なければ従来方式として扱う。
      const codeVerifier = consumePkceCodeVerifier();

      // 今回のログイン方式を記録しておき、次回のログイン開始時に同じ方式へ誘導する。
      saveAuthFlow(codeVerifier ? "pkce" : "legacy");

      // 一時コードが無ければ、ログイン開始からやり直す
      if (!code) {
        startLogin();
        return;
      }

      try {
        await getToken(code, codeVerifier);
      } catch (error) {
        // 401（PKCE検証失敗など）はエラー表示、それ以外はログインからやり直す
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setErrorMessage("認証エラー");
          return;
        }
        startLogin();
        return;
      }

      try {
        await handleUserNavigation();
      } catch {
        startLogin();
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
