import axios from "axios";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LOGIN_URL = process.env.REACT_APP_LOGIN_URL ?? "";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";

const Callback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const code = new URLSearchParams(location.search).get("code");

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
        navigate("/sadmin/toppage");
        break;
      case "admin":
        navigate("/admin/toppage");
        break;
      default:
        navigate("/user/toppage");
    }
  };

  useEffect(() => {
    const startCallback = async () => {
      if (code) {
        await getToken();
        navigateByRole();
      } else {
        window.location.href = LOGIN_URL;
      }
    };

    startCallback();
  }, []);

  return <></>;
};

export default Callback;
