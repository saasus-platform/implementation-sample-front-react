import axios from "axios";
import { useEffect, useState } from "react";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";

// ユーザ一覧取得
const UserPage = () => {
  const [users, setUsers] = useState<any>();
  const [myPlan, setMyPlan] = useState<any>();

  const getUsers = async () => {
    const jwtToken = window.localStorage.getItem("SaaSusIdToken");
    const res = await axios.get(`${API_ENDPOINT}/users`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });
    // 取得したユーザ一覧をコンソールに表示
    console.log(res.data);
    setUsers(res.data);
  };

  // ロールによって遷移先を振り分け
  const GetMyPlan = async () => {
    // ロールの取得
    const jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
    const res = await axios.get(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });

    console.log(res.data);
    setMyPlan(res.data.tenants[0].plan_id);
  };

  useEffect(() => {
    getUsers();
    GetMyPlan();
  }, []);

  return (
    <>
      <label>料金プラン：{myPlan ? myPlan : "未設定"}</label>
      <br />
      <br />
      <table>
        <thead>
          <tr>
            <td>テナントID</td>
            <td>UUID</td>
            <td>名前</td>
            <td>メールアドレス</td>
          </tr>
        </thead>
        <tbody>
          {users?.map((user: any) => {
            return (
              <tr key={user.id}>
                <td>{user.tenant_name}</td>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.attributes.name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default UserPage;
