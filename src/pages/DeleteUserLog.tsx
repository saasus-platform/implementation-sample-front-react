import axios from "axios";
import { useEffect, useState } from "react";
import { API_ENDPOINT } from "../const";
import { idTokenCheck } from "../utils";
import { DeletedUser, UserInfo } from "../types";

const DeleteUserLog = () => {
  const [deleteUsers, setDeleteUsers] = useState<DeletedUser[]>([]);
  const [userinfo, setUserinfo] = useState<UserInfo | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ユーザー削除ログを取得
  const GetDeleteUsers = async (tenantId: string) => {
    if (!userinfo) return;

    const res = await axios.get<DeletedUser[]>(
      `${API_ENDPOINT}/delete_user_log`,
      {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-SaaSus-Referer": "GetDeleteUsers",
        },
        withCredentials: true,
        params: {
          tenant_id: tenantId,
          user_id: userinfo.id,
        },
      }
    );
    setDeleteUsers(res.data);
  };

  // ログインユーザの情報を取得
  const GetUserinfo = async () => {
    const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
        "X-SaaSus-Referer": "GetUserinfo",
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
      const tenantIdFromQuery = urlParams.get("tenant_id");
      setTenantId(tenantIdFromQuery);
      await idTokenCheck(jwtToken);
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
      <table border={1} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <td>テナントID</td>
            <td>ユーザーID</td>
            <td>メールアドレス</td>
            <td>削除日</td>
          </tr>
        </thead>
        <tbody>
          {deleteUsers?.map((deleteUser: DeletedUser) => (
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
      <br />
    </>
  );
};

export default DeleteUserLog;
