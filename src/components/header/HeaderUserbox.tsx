import { useState, useEffect } from "react";
import UserMfaSettingDialog from "../dialogs/UserMfaSettingDialog";
import { idTokenCheck } from "../../utils";

const HeaderUserbox = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null); // メールアドレス用の状態

  useEffect(() => {
    const idToken = localStorage.getItem("SaaSusIdToken");
    if (idToken) {
      try {
        const decodedToken = decodeJwtPayload(idToken);
        setEmail(decodedToken?.email || "未設定");
      } catch (error) {
        console.error("IDトークンのデコードに失敗しました", error);
        setEmail("取得失敗");
      }
    } else {
      setEmail("未ログイン");
    }
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const openMfaDialog = async () => {
    setMenuOpen(false);
    await idTokenCheck(localStorage.getItem("SaaSusIdToken") as string);
    setMfaDialogOpen(true);
  };

  return (
    <header className="flex justify-between items-center bg-gray-800 text-white px-5 py-3">
      <span className="text-lg font-bold">サンプルアプリ</span>
      <button
        onClick={toggleMenu}
        className="bg-transparent border-none text-white text-sm cursor-pointer"
      >
        {email ? `${email} ▼` : "ユーザー ▼"}
      </button>
      {menuOpen && (
        <div className="absolute top-12 right-5 bg-white text-black shadow-md rounded overflow-hidden min-w-[120px] z-50">
          <button
            onClick={openMfaDialog}
            className="w-full py-2 px-3 text-left bg-transparent border-none cursor-pointer text-sm hover:bg-gray-100"
          >
            多要素認証の設定
          </button>
        </div>
      )}
      <UserMfaSettingDialog
        open={mfaDialogOpen}
        handleClose={() => setMfaDialogOpen(false)}
      />
    </header>
  );
};

// JWTのペイロード部分をデコードする関数
const decodeJwtPayload = (token: string): { email?: string } | null => {
  try {
    const payloadBase64 = token.split(".")[1]; // JWTのペイロード部分
    const payloadDecoded = atob(payloadBase64); // Base64デコード
    return JSON.parse(payloadDecoded); // JSONに変換
  } catch (error) {
    console.error("JWTデコードエラー:", error);
    return null;
  }
};

export default HeaderUserbox;
