import axios from "axios";
import { useEffect, useState } from "react";

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";

// ユーザ一覧取得
const UserPage = () => {
  const [users, setUsers] = useState<any>();
  const [userinfo, setUserinfo] = useState<any>();
  const jwtToken = window.localStorage.getItem("SaaSusIdToken");

  const getUsers = async () => {
    const res = await axios.get(`${API_ENDPOINT}/users`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });
    console.log(res.data);
    setUsers(res.data);
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

    console.log(res.data);
    setUserinfo(res.data);
  };

  useEffect(() => {
    getUsers();
    GetUserinfo();
  }, []);

  return (
    <>
      ログインユーザの情報
      <br />
      名前：
      {userinfo?.tenants[0].user_attribute.name}
      <br />
      メールアドレス：
      {userinfo?.email}
      <br />
      ロール：
      {userinfo?.tenants[0].envs[2].roles[0].display_name}
      <br />
      料金プラン：
      {userinfo?.tenants[0].plan_id ? userinfo?.tenants[0].plan_id : "未設定"}
      <br />
      <br />
      <br />
      <br />
      ユーザ一覧
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
                <td>{user.attributes.name}</td>
                <td>{user.email}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default UserPage;
