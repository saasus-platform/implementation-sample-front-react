import axios from "axios";
import { useState, useEffect } from "react";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck } from "../utils";

const UserInvitation = () => {
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState<any>();
  const [invitations, setInvitations] = useState<any>();
  const [error, setError] = useState("");
  const accessToken = window.localStorage.getItem(
    "SaaSusAccessToken"
  ) as string;
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  // ユーザ一覧取得
  const getInvitations = async (tenantId: any) => {
    try {
      const res = await axios.get(`${API_ENDPOINT}/invitations`, {
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
    } catch (err: any) {
      console.error(err);
      if (!err.response) {
        setError(
          "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。"
        );
      } else if (err.response.status === 404) {
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
    } catch (err: any) {
      console.error(err);
      if (!err.response) {
        setError(
          "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。"
        );
      } else if (err.response.status === 404) {
        setError("この機能はまだ実装されていません。");
      } else {
        window.location.href = LOGIN_URL;
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="email">メールアドレス：</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />{" "}
          <button type="submit">招待する</button>
        </p>
        <br />
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table border={1} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <td>メールアドレス</td>
            <td>招待リンク</td>
            <td>役割</td>
            <td>ステータス</td>
            <td>有効期限</td>
          </tr>
        </thead>
        <tbody>
          {invitations?.map((invitation: any, tenantIndex: number) => {
            return (
              <tr key={invitation.id}>
                <td>{invitation.email}</td>
                <td>{invitation.invitation_url}</td>
                <td>
                  {invitation.envs?.[0]?.roles?.map(
                    (role: any, index: number) => (
                      <div key={index}>{role.display_name}</div>
                    )
                  )}
                </td>
                <td>{invitation.status}</td>
                <td>
                  {invitation.expired_at
                    ? new Date(invitation.expired_at * 1000).toLocaleString()
                    : "N/A"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <a href={`/admin/toppage?tenant_id=${tenantId}`}>ユーザー一覧</a>
    </>
  );
};

export default UserInvitation;
