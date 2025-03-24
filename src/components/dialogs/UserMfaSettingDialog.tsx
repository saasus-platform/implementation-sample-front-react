import { useState, useEffect } from "react";
import { API_ENDPOINT } from "../../const";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import { idTokenCheck } from "../../utils";

type Props = {
  open: boolean;
  handleClose: () => void;
};

const UserMfaSettingDialog = ({ open, handleClose }: Props) => {
  const [qrCodeUrl, setQrCodeUrl] = useState(""); // QRコードURL
  const [verificationCode, setVerificationCode] = useState(""); // 入力されたMFAコード
  const [isMfaEnabled, setIsMfaEnabled] = useState(false); // MFA有効状態フラグ
  const [showQrCode, setShowQrCode] = useState(false); // QRコード表示フラグ
  const [isFeatureAvailable, setIsFeatureAvailable] = useState(true); // 機能が利用可能か
  const [error, setError] = useState("");
  const [jwtToken, setJwtToken] = useState(
    localStorage.getItem("SaaSusIdToken") as string
  );
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem("SaaSusAccessToken") as string | null
  );

  // ダイアログが開いた時にトークンをチェック＆最新のトークンをセット
  useEffect(() => {
    const updateTokensAndCheckStatus = async () => {
      await idTokenCheck(localStorage.getItem("SaaSusIdToken") as string);
      setJwtToken(localStorage.getItem("SaaSusIdToken") as string);
      setAccessToken(localStorage.getItem("SaaSusAccessToken"));

      await checkMfaStatus();
    };

    if (open) {
      setShowQrCode(false);
      updateTokensAndCheckStatus();
    }
  }, [open]);

  // MFAの状態を確認
  const checkMfaStatus = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINT}/mfa_status`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
        },
        withCredentials: true,
      });

      setIsMfaEnabled(response.data.enabled);
      setIsFeatureAvailable(true);
    } catch (err: any) {
      console.error(err);
      if (!err.response) {
        setError(
          "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。"
        );
        setIsFeatureAvailable(false);
      } else if (err.response.status === 404) {
        setError("この機能はまだ実装されていません。");
        setIsFeatureAvailable(false);
      } else {
        setError("MFAの状態取得に失敗しました");
      }
    }
  };

  // QRコードを取得する
  const fetchMfaSetup = async () => {
    if (!accessToken) {
      setError("アクセストークンがありません");
      return;
    }

    try {
      const response = await axios.get(`${API_ENDPOINT}/mfa_setup`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          Authorization: `Bearer ${jwtToken}`,
          "X-Access-Token": accessToken,
        },
        withCredentials: true,
      });

      setQrCodeUrl(response.data.qrCodeUrl);
      setShowQrCode(true);
    } catch (err) {
      console.error(err);
      setError("MFAのセットアップ情報の取得に失敗しました");
    }
  };

  // 認証コードの検証
  const handleVerifyMfa = async () => {
    if (!verificationCode) {
      setError("認証コードを入力してください");
      return;
    }

    if (!accessToken) {
      setError("アクセストークンがありません");
      return;
    }

    try {
      const response = await axios.post(
        `${API_ENDPOINT}/mfa_verify`,
        { verification_code: verificationCode },
        {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            Authorization: `Bearer ${jwtToken}`,
            "X-Access-Token": accessToken,
          },
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        // setIsVerified(true);
        setIsMfaEnabled(true);
        setError("");

        // MFAを有効化
        await enableUserMfaPreference();
        setShowQrCode(false);
      } else {
        setError("MFA認証に失敗しました");
      }
    } catch (err) {
      console.error(err);
      setError("MFA認証に失敗しました");
    }
  };
  // MFA有効化
  const enableUserMfaPreference = async () => {
    try {
      await axios.post(
        `${API_ENDPOINT}/mfa_enable`,
        {},
        {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            Authorization: `Bearer ${jwtToken}`,
          },
          withCredentials: true,
        }
      );

      setIsMfaEnabled(true);
    } catch (err) {
      console.error(err);
      setError("MFAの有効化に失敗しました");
    }
  };
  // MFA無効化
  const disableUserMfaPreference = async () => {
    try {
      await axios.post(
        `${API_ENDPOINT}/mfa_disable`,
        {},
        {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            Authorization: `Bearer ${jwtToken}`,
          },
          withCredentials: true,
        }
      );

      setIsMfaEnabled(false);
      setShowQrCode(false);
      handleClose();
    } catch (err) {
      console.error(err);
      setError("MFAの無効化に失敗しました");
    }
  };

  return open ? (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <h2>多要素認証</h2>
        {!isFeatureAvailable ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : isMfaEnabled ? (
          <>
            <p>多要素認証は設定済みです</p>
            {!showQrCode ? (
              <>
                <button
                  onClick={() => {
                    fetchMfaSetup();
                    setShowQrCode(true);
                  }}
                  style={{ ...styles.buttonBase, ...styles.buttonPrimary }}
                >
                  デバイスを再登録
                </button>
                <button
                  onClick={disableUserMfaPreference}
                  style={{ ...styles.buttonBase, ...styles.buttonSecondary }}
                >
                  多要素認証を解除する
                </button>
              </>
            ) : (
              <>
                <p>
                  スマートフォンのGoogle
                  Authenticator、またはAuthyアプリで設定してください。
                </p>
                <QRCodeCanvas value={qrCodeUrl} size={150} />
                <input
                  type="text"
                  placeholder="認証コードを入力"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  style={styles.input}
                />
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button
                  onClick={handleVerifyMfa}
                  style={{ ...styles.buttonBase, ...styles.buttonPrimary }}
                >
                  確認
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {!showQrCode ? (
              <>
                <p>
                  デバイスが設定されていません。有効にするにはデバイスを追加してください。
                </p>
                <button
                  onClick={() => {
                    fetchMfaSetup();
                    setShowQrCode(true);
                  }}
                  style={{ ...styles.buttonBase, ...styles.buttonPrimary }}
                >
                  デバイスを追加する
                </button>
              </>
            ) : (
              <>
                <p>
                  スマートフォンのGoogle
                  Authenticator、またはAuthyアプリで設定してください。
                </p>
                <QRCodeCanvas value={qrCodeUrl} size={150} />
                <input
                  type="text"
                  placeholder="認証コードを入力"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  style={styles.input}
                />
                {error && <p style={{ color: "red" }}>{error}</p>}
                <button
                  onClick={handleVerifyMfa}
                  style={{ ...styles.buttonBase, ...styles.buttonPrimary }}
                >
                  確認
                </button>
              </>
            )}
          </>
        )}
        <button
          onClick={handleClose}
          style={{ ...styles.buttonBase, ...styles.closeButton }}
        >
          閉じる
        </button>
      </div>
    </div>
  ) : null;
};

// スタイル
const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "320px",
    textAlign: "center",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    color: "black",
  },
  input: {
    width: "90%",
    padding: "10px",
    margin: "10px 0",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  buttonBase: {
    width: "100%",
    padding: "12px",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    border: "none",
    marginTop: "10px",
  },
  buttonPrimary: {
    backgroundColor: "#007bff",
    color: "#fff",
  },
  buttonSecondary: {
    backgroundColor: "#fff",
    color: "#007bff",
    border: "1px solid #007bff",
  },
  closeButton: {
    backgroundColor: "transparent",
    border: "1px solid black",
    color: "black",
  },
};

export default UserMfaSettingDialog;
