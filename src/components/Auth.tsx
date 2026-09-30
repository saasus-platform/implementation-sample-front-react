import axios from "axios";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { API_ENDPOINT } from "../const";
import { useUser } from "../contexts/UserContext";
import { UserInfo } from "../types";
import { redirectToLogin } from "../pkce";

const Auth = () => {
  const location = useLocation();
  const { setUserInfo } = useUser();

  // ログインユーザの情報を取得
  const getUserInfo = async () => {
    try {
      const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "X-SaaSus-Referer": location.pathname,
        },
        withCredentials: true,
      });
      return res;
    } catch {
      console.log("error:userinfo");
    }
  };

  useEffect(() => {
    getUserInfo().then((res) => {
      // ログインユーザの情報が取得できない（ログインが確認できない）場合、ログイン画面に遷移
      if (!res) {
        setUserInfo(null);
        // PKCE: code_verifier を生成・保持し、code_challenge付きでログイン画面へ
        void redirectToLogin();
        return;
      }

      setUserInfo(res.data);
    });
  }, []);

  return <Outlet />;
};

export default Auth;
