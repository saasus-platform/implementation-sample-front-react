import axios from "axios";
import { useState, useEffect } from "react";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";
import { ApiError, Invitation } from "../types";

const UserInvitation = () => {
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState("");
  const accessToken = window.localStorage.getItem(
    "SaaSusAccessToken"
  ) as string;
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ユーザ一覧取得
  const getInvitations = async (tenantId: string | null) => {
    if (!tenantId) return;
    try {
      const res = await axios.get<Invitation[]>(`${API_ENDPOINT}/invitations`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
        },
        withCredentials: true,
        params: {
          tenant_id: tenantId,
        },
      });
      setInvitations(res.data);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      if (!error.response) {
        setError(
          "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。"
        );
      } else if (error.response.status === 404) {
        setError("この機能はまだ実装されていません。");
      } else {
        window.location.href = LOGIN_URL;
      }
    }
  };

  useEffect(() => {
    const startUserRegisterPage = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantIdFromQuery = urlParams.get("tenant_id");
      setTenantId(tenantIdFromQuery);
      getInvitations(tenantIdFromQuery);
      await idTokenCheck(jwtToken);
    };
    startUserRegisterPage();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await axios.post(
        `${API_ENDPOINT}/user_invitation`,
        {
          email,
          tenantId,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
            "X-Access-Token": accessToken,
          },
          withCredentials: true,
        }
      );
      // リダイレクトはaxiosの成功後に行う
      if (response.status === 200) {
        window.location.href = `/user_invitation?tenant_id=${tenantId}`;
      }
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      if (!error.response) {
        setError(
          "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。"
        );
      } else if (error.response.status === 404) {
        setError("この機能はまだ実装されていません。");
      } else {
        window.location.href = LOGIN_URL;
      }
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">ユーザー招待</h1>

      {/* ユーザー招待フォーム */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row md:items-end gap-4"
        >
          <div className="flex-1">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="example@example.com"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
            >
              招待する
            </button>
          </div>
        </form>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* 招待一覧 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <h2 className="text-xl font-semibold p-4 bg-gray-50 border-b">
          招待一覧
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  招待リンク
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  役割
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  有効期限
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations?.map((invitation: Invitation) => (
                <tr key={invitation.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {invitation.email}
                  </td>
                  <td className="py-3 px-4">
                    <div className="max-w-xs truncate">
                      {invitation.invitation_url}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {invitation.envs?.[0]?.roles?.map((role, index: number) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1"
                      >
                        {role.display_name}
                      </span>
                    ))}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        invitation.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : invitation.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {invitation.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {invitation.expired_at
                      ? new Date(invitation.expired_at * 1000).toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ユーザー一覧に戻るリンク */}
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

export default UserInvitation;
