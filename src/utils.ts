import axios from "axios";
import { API_ENDPOINT, LOGIN_URL } from "./const";
import { UserInfo, Tenant } from "./types";

type Jwt = {
  [name: string]: string | number | boolean;
};

const sleep = (second: number) =>
  new Promise((resolve) => setTimeout(resolve, second * 1000));

export const idTokenCheck = async (jwtToken: string) => {
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

      const accessToken = res.data.access_token;
      localStorage.setItem("SaaSusAccessToken", accessToken);

      await sleep(1);
      return;
    } catch (err) {
      console.log(err);
      window.location.href = LOGIN_URL;
    }
  }
};

/**
 * 指定された UNIX タイムスタンプの範囲内でランダムな整数（秒）を返す
 * @param start 開始の UNIX タイムスタンプ（秒）
 * @param end   終了の UNIX タイムスタンプ（秒）
 * @returns     start 以上 end 以下のランダムな整数
 */
export const randomUnixBetween = (start: number, end: number): number => {
  // Math.random() は 0 <= x < 1 の実数を返す
  // (end - start + 1) を掛けて範囲を調整し、Math.floor で整数に変換、start を足してオフセット
  return Math.floor(Math.random() * (end - start + 1)) + start;
};

/**
 * ユーザーのロールに応じて適切なユーザーページに遷移する関数
 * @param tenantId テナントID
 * @param navigate React Routerのnavigate関数
 * @param pagePath 現在のページパス
 */
export const navigateToUserPageByRole = async (
  tenantId: string, 
  navigate: (path: string) => void,
  pagePath: string
) => {
  try {
    // ロールの取得
    const jwtToken = window.localStorage.getItem("SaaSusIdToken");
    const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Authorization: `Bearer ${jwtToken}`,
        "X-SaaSus-Referer": pagePath,
      },
      withCredentials: true,
    });

    const tenant = res.data.tenants.find(
      (tenant: Tenant) => tenant.id === tenantId
    );

    const role = tenant?.envs[0]?.roles[0]?.role_name || "";

    // ロールに応じてリダイレクト
    switch (role) {
      case "sadmin":
        navigate(`/sadmin/toppage?tenant_id=${tenantId}`);
        break;
      case "admin":
        navigate(`/admin/toppage?tenant_id=${tenantId}`);
        break;
      default:
        navigate(`/user/toppage?tenant_id=${tenantId}`);
        break;
    }
  } catch (error) {
    console.error("ユーザー情報の取得に失敗しました:", error);
    // エラーの場合はデフォルトでuser/toppageに遷移
    navigate(`/user/toppage?tenant_id=${tenantId}`);
  }
};

