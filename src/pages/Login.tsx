import { useEffect } from "react";
import { redirectToLogin } from "../pkce";

// ログイン開始の受け口。
// アプリ内でログインが必要になった箇所（未ログイン検知・ログアウト・
// セッション切れなど）は、この /login へ遷移させる。
// PKCE の開始処理（code_verifier 生成・code_challenge 付与・SaaSus の
// ログイン画面へのリダイレクト）は pkce.ts の redirectToLogin に集約する。
const Login = () => {
  useEffect(() => {
    void redirectToLogin();
  }, []);

  return <></>;
};

export default Login;
