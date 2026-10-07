import { LOGIN_URL } from "./const";

// 【サンプルアプリ固有】
// このファイルは、通常ログインと PKCE ログインの両方を 1 つのサンプルで
// 試せるようにするための仕組みである。
// 直近に成功したログイン方式を記録し、次回のログイン開始時に同じ方式へ誘導する。
//
// 実際のアプリケーションでは、通常ログインと PKCE のどちらか一方を採用して
// 実装すればよく、方式を記録・分岐するこのような仕組みは不要である。
// （PKCE を採用する場合は、常に PKCE の受け口からログインを開始すればよい）

// 直近に成功したログイン方式を localStorage に記録しておき、
// 次回のログイン開始時に同じ方式へ誘導するためのキー。
const AUTH_FLOW_STORAGE_KEY = "sample-saas.auth_flow";

export type AuthFlow = "pkce" | "legacy";

// callback で方式が確定したときに記録する。
export const saveAuthFlow = (authFlow: AuthFlow): void => {
  try {
    window.localStorage.setItem(AUTH_FLOW_STORAGE_KEY, authFlow);
  } catch {
    // 保存に失敗しても致命的ではないため無視する。
  }
};

// 記録済みの方式を取り出す（取り出すと同時に削除する）。
// 記録が無い場合（初回など）は null を返し、通常ログインとして扱う。
const consumeAuthFlow = (): AuthFlow | null => {
  try {
    const value = window.localStorage.getItem(AUTH_FLOW_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_FLOW_STORAGE_KEY);
    return value === "pkce" || value === "legacy" ? value : null;
  } catch {
    return null;
  }
};

// ログインを開始する。
// 直近の方式が PKCE であれば PKCE の受け口（/login）へ、
// それ以外（通常／初回）は SaaSus のログイン画面へ直接遷移する。
export const startLogin = (): void => {
  const authFlow = consumeAuthFlow();
  if (authFlow === "pkce") {
    window.location.href = "/login";
    return;
  }
  // 通常ログイン：パラメータなしで SaaSus のログイン画面へ
  window.location.href = LOGIN_URL;
};
