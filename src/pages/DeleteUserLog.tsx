import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_ENDPOINT } from "../const";
import { idTokenCheck } from "../utils";
import { DeletedUser, UserInfo } from "../types";

const DeleteUserLog = () => {
  const [deleteUsers, setDeleteUsers] = useState<DeletedUser[]>([]);
  const [userinfo, setUserinfo] = useState<UserInfo | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const location = useLocation();
  const pagePath = location.pathname;
  // ページ内で共通して使用するヘッダーを定義
  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${jwtToken}`,
    "X-SaaSus-Referer": pagePath, // すべてのAPIでこの共通のパスを使用
  };
  // ユーザー削除ログを取得
  const GetDeleteUsers = async (tenantId: string) => {
    if (!userinfo) return;
    const res = await axios.get<DeletedUser[]>(
      `${API_ENDPOINT}/delete_user_log`,
      {
        headers: commonHeaders,
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
      headers: commonHeaders,
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
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">削除ユーザ一覧</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  テナントID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  ユーザーID
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  削除日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deleteUsers?.map((deleteUser: DeletedUser) => (
                <tr key={deleteUser.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {deleteUser.tenant_id}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {deleteUser.user_id}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {deleteUser.email}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {formatDate(deleteUser.delete_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <a
          href={`/admin/toppage?tenant_id=${tenantId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          ユーザー一覧に戻る
        </a>
      </div>
    </div>
  );
};

export default DeleteUserLog;
