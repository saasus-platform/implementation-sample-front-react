import axios from "axios";
import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";

const LOGIN_URL = process.env.REACT_APP_LOGIN_URL ?? "";
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT ?? "";
const sleep = (second: number) =>
  new Promise((resolve) => setTimeout(resolve, second * 1000));

const UserPage = () => {
  const [users, setUsers] = useState<any>();
  const [userinfo, setUserinfo] = useState<any>();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const [cookies] = useCookies(["SaaSusRefreshToken"]);

  // JWT格納用型定義
  type Jwt = {
    [name: string]: string | number | boolean;
  };

  // JWTのアップデート処理
  const idTokenCheck = async () => {
    // JWTのデコード
    const base64Url = jwtToken.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(
      decodeURIComponent(escape(window.atob(base64)))
    ) as Jwt;

    // デコードしたJWTの有効期限チェック
    // JWTの有効期限が切れている場合は新しいトークンを取得する
    const expireDate = decoded["exp"] as number;
    const timestamp = parseInt(Date.now().toString().slice(0, 10));
    if (expireDate <= timestamp) {
      try {
        console.log("token expired");
        // リフレッシュトークンからJWT取得
        const res = await axios.get(`${API_ENDPOINT}/refresh`, {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
          withCredentials: true,
        });

        // JWTをLocal Storageに保存
        jwtToken = res.data.id_token;
        localStorage.setItem("SaaSusIdToken", jwtToken);

        // JWTを更新してすぐ使用すると、Token used before used エラーになるため。
        // ref: https://github.com/dgrijalva/jwt-go/issues/383
        await sleep(1);
        return;
      } catch (err) {
        console.log(err);
        window.location.href = LOGIN_URL;
      }
    }
  };

  // ユーザ一覧取得
  const getUsers = async () => {
    const res = await axios.get(`${API_ENDPOINT}/users`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
      },
      withCredentials: true,
    });
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

    setUserinfo(res.data);
  };

  useEffect(() => {
    const startUserPage = async () => {
      await idTokenCheck();
      getUsers();
      GetUserinfo();
    };

    startUserPage();
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
      {userinfo?.tenants[0].envs[0].roles[0].display_name}
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
