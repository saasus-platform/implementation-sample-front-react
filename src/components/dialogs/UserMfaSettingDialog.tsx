import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_ENDPOINT } from "../../const";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import { idTokenCheck } from "../../utils";
import { ApiError, MfaSetupResponse, MfaStatusResponse } from "../../types";

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
  const location = useLocation();
  const pagePath = location.pathname;
  // ページ内で共通して使用するヘッダーを定義
  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${jwtToken}`,
    "X-SaaSus-Referer": pagePath, // すべてのAPIでこの共通のパスを使用
  };
  const getActionHeaders = (actionName: string) => {
    return {
      ...commonHeaders,
      "X-SaaSus-Referer": `${pagePath}?action=${actionName}`,
    };
  };
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
      const response = await axios.get<MfaStatusResponse>(
        `${API_ENDPOINT}/mfa_status`,
        {
          headers: commonHeaders,
          withCredentials: true,
        }
      );
      setIsMfaEnabled(response.data.enabled);
      setIsFeatureAvailable(true);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      if (!error.response) {
        setError(
          "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。"
        );
        setIsFeatureAvailable(false);
      } else if (error.response.status === 404) {
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
      const response = await axios.get<MfaSetupResponse>(
        `${API_ENDPOINT}/mfa_setup`,
        {
          headers: {
            ...commonHeaders,
            "X-Access-Token": accessToken, // 既存のヘッダーに加えて、追加のアクセストークンヘッダーを設定
          },
          withCredentials: true,
        }
      );
      setQrCodeUrl(response.data.qrCodeUrl);
      setShowQrCode(true);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
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
            ...getActionHeaders("mfa_verify"),
            "X-Access-Token": accessToken, // 既存のヘッダーに加えて、追加のアクセストークンヘッダーを設定
          },
          withCredentials: true,
        }
      );
      if (response.status === 200) {
        setIsMfaEnabled(true);
        setError("");
        // MFAを有効化
        await enableUserMfaPreference();
        setShowQrCode(false);
      } else {
        setError("MFA認証に失敗しました");
      }
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
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
          headers: getActionHeaders("mfa_enable"),
          withCredentials: true,
        }
      );
      setIsMfaEnabled(true);
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
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
          headers: getActionHeaders("mfa_disable"),
          withCredentials: true,
        }
      );
      setIsMfaEnabled(false);
      setShowQrCode(false);
      handleClose();
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      setError("MFAの無効化に失敗しました");
    }
  };

  return open ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg w-80 text-center shadow-lg text-black">
        <h2 className="text-xl font-semibold mb-4">多要素認証</h2>
        {!isFeatureAvailable ? (
          <p className="text-red-600">{error}</p>
        ) : isMfaEnabled ? (
          <>
            <p className="mb-4">多要素認証は設定済みです</p>
            {!showQrCode ? (
              <>
                <button
                  onClick={() => {
                    fetchMfaSetup();
                    setShowQrCode(true);
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-md mb-2 hover:bg-blue-700"
                >
                  デバイスを再登録
                </button>
                <button
                  onClick={disableUserMfaPreference}
                  className="w-full py-3 bg-white text-blue-600 border border-blue-600 rounded-md mb-4 hover:bg-blue-50"
                >
                  多要素認証を解除する
                </button>
              </>
            ) : (
              <>
                <p className="mb-4">
                  スマートフォンのGoogle
                  Authenticator、またはAuthyアプリで設定してください。
                </p>
                <div className="mb-4 flex justify-center">
                  <QRCodeCanvas value={qrCodeUrl} size={150} />
                </div>
                <input
                  type="text"
                  placeholder="認証コードを入力"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-11/12 p-2 border border-gray-300 rounded-md mb-4"
                />
                {error && <p className="text-red-600 mb-2">{error}</p>}
                <button
                  onClick={handleVerifyMfa}
                  className="w-full py-3 bg-blue-600 text-white rounded-md mb-2 hover:bg-blue-700"
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
                <p className="mb-4">
                  デバイスが設定されていません。有効にするにはデバイスを追加してください。
                </p>
                <button
                  onClick={() => {
                    fetchMfaSetup();
                    setShowQrCode(true);
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-md mb-2 hover:bg-blue-700"
                >
                  デバイスを追加する
                </button>
              </>
            ) : (
              <>
                <p className="mb-4">
                  スマートフォンのGoogle
                  Authenticator、またはAuthyアプリで設定してください。
                </p>
                <div className="mb-4 flex justify-center">
                  <QRCodeCanvas value={qrCodeUrl} size={150} />
                </div>
                <input
                  type="text"
                  placeholder="認証コードを入力"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-11/12 p-2 border border-gray-300 rounded-md mb-4"
                />
                {error && <p className="text-red-600 mb-2">{error}</p>}
                <button
                  onClick={handleVerifyMfa}
                  className="w-full py-3 bg-blue-600 text-white rounded-md mb-2 hover:bg-blue-700"
                >
                  確認
                </button>
              </>
            )}
          </>
        )}
        <button
          onClick={handleClose}
          className="w-full py-3 bg-transparent border border-gray-800 text-gray-800 rounded-md hover:bg-gray-100"
        >
          閉じる
        </button>
      </div>
    </div>
  ) : null;
};

export default UserMfaSettingDialog;
