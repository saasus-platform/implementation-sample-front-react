import axios from "axios";
import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";

const LOGIN_URL = process.env.REACT_APP_LOGIN_URL ?? "";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";

const Auth = () => {
  // ユーザID取得
  const getUserInfo = async () => {
    const jwtToken = window.localStorage.getItem("SaaSusIdToken");
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });
    return res.data.id;
  };

  useEffect(() => {
    getUserInfo().then((id) => {
      // ユーザIDが取得できなかったらログイン画面に遷移
      if (!id) {
        window.location.href = LOGIN_URL;
      }
    });
  }, []);

  return <Outlet />;
};

export default Auth;
