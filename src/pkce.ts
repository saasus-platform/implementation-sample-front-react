import { LOGIN_URL } from "./const";

export const PKCE_CODE_VERIFIER_STORAGE_KEY =
  "sample-saas.pkce.code_verifier";

const encodeBase64Url = (value: Uint8Array): string => {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const generatePkceParameters = async (): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> => {
  const randomValue = new Uint8Array(32);
  window.crypto.getRandomValues(randomValue);
  const codeVerifier = encodeBase64Url(randomValue);
  const encodedVerifier = Uint8Array.from(
    codeVerifier,
    (character) => character.charCodeAt(0)
  );
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    encodedVerifier
  );

  return {
    codeVerifier,
    codeChallenge: encodeBase64Url(new Uint8Array(digest)),
  };
};

// ログイン画面にリダイレクトする際、クエリパラメータをセットする
export const redirectToLogin = async (): Promise<void> => {
  window.sessionStorage.removeItem(PKCE_CODE_VERIFIER_STORAGE_KEY);

  const { codeVerifier, codeChallenge } = await generatePkceParameters();
  window.sessionStorage.setItem(
    PKCE_CODE_VERIFIER_STORAGE_KEY,
    codeVerifier
  );

  const loginUrl = new URL(LOGIN_URL, window.location.origin);
  loginUrl.searchParams.set("code_challenge", codeChallenge);
  loginUrl.searchParams.set("code_challenge_method", "S256");
  window.location.assign(loginUrl.toString());
};

export const consumePkceCodeVerifier = (): string | null => {
  try {
    const codeVerifier = window.sessionStorage.getItem(
      PKCE_CODE_VERIFIER_STORAGE_KEY
    );
    window.sessionStorage.removeItem(PKCE_CODE_VERIFIER_STORAGE_KEY);
    return codeVerifier;
  } catch {
    return null;
  }
};
