import axios from "axios";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { API_ENDPOINT, LOGIN_URL } from "../const";

const Auth = () => {
  // ログインユーザの情報を取得
  const getUserInfo = async () => {
    try {
      const jwtToken = window.localStorage.getItem("SaaSusIdToken");
      const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetUserInfo",
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
        window.location.href = LOGIN_URL;
      }
    });
  }, []);

  return <Outlet />;
};

export default Auth;
