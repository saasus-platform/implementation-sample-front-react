import axios from "axios";
import { API_ENDPOINT } from "./const";
import { UserInfo, Tenant } from "./types";

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
    const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
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
