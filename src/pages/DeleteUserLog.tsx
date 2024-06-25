import axios from "axios";
import { userInfo } from "os";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from 'react-router-dom';

const LOGIN_URL = process.env.REACT_APP_LOGIN_URL ?? "";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";
const sleep = (second: number) =>
  new Promise((resolve) => setTimeout(resolve, second * 1000));

const DeleteUserLog = () => {
  const [deleteUsers, setDeleteUsers] = useState<any>();
  const [userinfo, setUserinfo] = useState<any>();
  const [userAttributes, setUserAttributes] = useState<any>();
  const [tenantId, setTenantId] = useState<any>();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const [cookies] = useCookies(["SaaSusRefreshToken"]);

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

  // ユーザー削除ログを取得
  const GetDeleteUsers = async (tenantId:any) => {
    const res = await axios.get(`${API_ENDPOINT}/delete_user_log`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
      params: {
        tenant_id: tenantId,
        user_id: userinfo.id
      }
    });

    setDeleteUsers(res.data);
  };

  // ログインユーザの情報を取得
  const GetUserinfo = async () => {
      const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
          headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          },
          withCredentials: true,
      });
      setUserinfo(res.data);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("ja-JP", options);
  };

  useEffect(() => {
    const startUserPage = async () => {
      // テナントIDをクエリパラメータから取得
      const urlParams = new URLSearchParams(window.location.search);
      const tenantIdFromQuery = urlParams.get('tenant_id');
      setTenantId(tenantIdFromQuery);

      await idTokenCheck();
      await GetUserinfo();
    };

    startUserPage();
  }, []);

  useEffect(() => {
    if (tenantId && userinfo?.id) {
      GetDeleteUsers(tenantId);
    }
  }, [tenantId, userinfo]);

  return (
    <>
      削除ユーザ一覧
      <table border={1} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <td>テナントID</td>
            <td>ユーザーID</td>
            <td>メールアドレス</td>
            <td>削除日</td>
          </tr>
        </thead>
        <tbody>
          {deleteUsers?.map((deleteUser: any) => (
            <tr key={deleteUser.id}>
              <td>{deleteUser.tenant_id}</td>
              <td>{deleteUser.user_id}</td>
              <td>{deleteUser.email}</td>
              <td>{formatDate(deleteUser.delete_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href={`/admin/toppage?tenant_id=${tenantId}`}>ユーザー一覧</a>
    </>
  );
};

export default DeleteUserLog;
