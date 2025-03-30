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
    <header style={styles.header}>
      <span style={styles.title}>サンプルアプリ</span>
      <button onClick={toggleMenu} style={styles.userButton}>
        {email ? `${email} ▼` : "ユーザー ▼"}
      </button>
      {menuOpen && (
        <div style={styles.menu}>
          <button onClick={openMfaDialog} style={styles.menuItem}>
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

// スタイル
const styles: { [key: string]: React.CSSProperties } = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#333",
    color: "white",
    padding: "10px 20px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  userButton: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "14px",
    cursor: "pointer",
  },
  menu: {
    position: "absolute",
    top: "50px",
    right: "20px",
    backgroundColor: "white",
    color: "black",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
    borderRadius: "4px",
    overflow: "hidden",
    minWidth: "120px",
    zIndex: 100,
  },
  menuItem: {
    width: "100%",
    padding: "10px",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default HeaderUserbox;
