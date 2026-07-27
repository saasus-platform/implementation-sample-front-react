import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_ENDPOINT } from "../../const";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import {
  ApiError,
  MfaMethod,
  MfaSetupResponse,
  MfaStatusResponse,
} from "../../types";

type Props = {
  open: boolean;
  handleClose: () => void;
};

/**
 * MFAダイアログのステップ
 * - loading: 状態取得中
 * - select: 認証方式選択（未設定時）
 * - email-confirm: メール認証確認画面
 * - totp-setup: QRコード表示＋認証コード入力
 * - current-email: メール認証設定済み
 * - current-totp: アプリ認証設定済み
 * - done: 設定完了
 */
type Step =
  | "loading"
  | "select"
  | "email-confirm"
  | "totp-setup"
  | "current-email"
  | "current-totp"
  | "done";

const UserMfaSettingDialog = ({ open, handleClose }: Props) => {
  const [step, setStep] = useState<Step>("loading");
  const [currentMethod, setCurrentMethod] = useState<MfaMethod | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isFeatureAvailable, setIsFeatureAvailable] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const location = useLocation();
  const pagePath = location.pathname;

  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    "X-SaaSus-Referer": pagePath,
  };

  const getActionHeaders = (actionName: string) => ({
    ...commonHeaders,
    "X-SaaSus-Referer": `${pagePath}?action=${actionName}`,
  });

  // ダイアログを開いた時にMFAステータスを取得
  useEffect(() => {
    if (open) {
      setError("");
      setVerificationCode("");
      setQrCodeUrl("");
      setStep("loading");
      setIsFeatureAvailable(true);
      checkMfaStatus();
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
      const { enabled, method } = response.data;
      setIsFeatureAvailable(true);

      if (!enabled) {
        setCurrentMethod(null);
        setStep("select");
      } else if (method === "softwareToken") {
        setCurrentMethod("softwareToken");
        setStep("current-totp");
      } else if (method === "email") {
        setCurrentMethod("email");
        setStep("current-email");
      } else {
        // methodが返されない場合（バックエンド未対応）は従来のTOTP設定済みとして扱う
        setCurrentMethod("softwareToken");
        setStep("current-totp");
      }
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
        setIsFeatureAvailable(false);
      }
    }
  };

  // TOTP設定開始（QRコード取得）
  const startTotpSetup = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await axios.get<MfaSetupResponse>(
        `${API_ENDPOINT}/mfa_setup`,
        {
          headers: commonHeaders,
          withCredentials: true,
        }
      );
      setQrCodeUrl(response.data.qrCodeUrl);
      setVerificationCode("");
      setStep("totp-setup");
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      if (error.response?.status === 404) {
        setError("認証アプリの設定機能はまだ実装されていません。");
      } else {
        setError("認証アプリの設定情報の取得に失敗しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // TOTP認証コードを検証して有効化
  const verifyAndEnableTotp = async (code = verificationCode) => {
    if (!code.trim()) {
      setError("認証コードを入力してください");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      // 1. コード検証
      const verifyRes = await axios.post(
        `${API_ENDPOINT}/mfa_verify`,
        { verification_code: code },
        {
          headers: getActionHeaders("mfa_verify"),
          withCredentials: true,
        }
      );
      if (verifyRes.status !== 200) {
        setError("認証コードが正しくありません");
        return;
      }

      // 2. TOTP方式で有効化
      await axios.post(
        `${API_ENDPOINT}/mfa_enable`,
        {},
        {
          headers: getActionHeaders("mfa_enable"),
          withCredentials: true,
        }
      );

      setCurrentMethod("softwareToken");
      setStep("done");
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      if (error.response?.status === 400) {
        setError("認証コードが正しくありません");
      } else {
        setError("認証アプリの登録に失敗しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // メール認証を有効化
  const enableEmail = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${API_ENDPOINT}/mfa_email_enable`,
        {},
        {
          headers: getActionHeaders("mfa_email_enable"),
          withCredentials: true,
        }
      );
      setCurrentMethod("email");
      setStep("done");
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      if (error.response?.status === 404) {
        setError("メール認証機能はまだ実装されていません。");
      } else {
        setError("メール認証の設定に失敗しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // MFA無効化
  const disableMfa = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      await axios.post(
        `${API_ENDPOINT}/mfa_disable`,
        {},
        {
          headers: getActionHeaders("mfa_disable"),
          withCredentials: true,
        }
      );
      setCurrentMethod(null);
      handleClose();
    } catch (err: unknown) {
      const error = err as ApiError;
      console.error(error);
      setError("多要素認証の解除に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 「戻る」ボタンの遷移先を決定
  const getBackStep = (): Step => {
    if (currentMethod === "email") return "current-email";
    if (currentMethod === "softwareToken") return "current-totp";
    return "select";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg w-96 shadow-lg text-black">
        <h2 className="text-xl font-semibold mb-4 text-center">
          多要素認証の設定
        </h2>

        {/* エラー表示 */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* 機能未実装時 */}
        {!isFeatureAvailable && (
          <div className="text-center">
            <button
              onClick={handleClose}
              className="w-full py-3 bg-transparent border border-gray-800 text-gray-800 rounded-md hover:bg-gray-100 mt-4"
            >
              閉じる
            </button>
          </div>
        )}

        {/* ローディング */}
        {isFeatureAvailable && step === "loading" && (
          <p className="text-sm text-gray-500 py-4 text-center">
            読み込み中...
          </p>
        )}

        {/* パターンA: 未設定 → 方式選択 */}
        {isFeatureAvailable && step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              認証方法を選択してください
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setError("");
                  setStep("email-confirm");
                }}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-gray-300 p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-sm">メール認証</span>
                <span className="text-xs text-gray-500 text-center">
                  ログイン時にメールで認証コードが届きます
                </span>
              </button>
              <button
                onClick={startTotpSetup}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-gray-300 p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-sm">認証アプリ</span>
                <span className="text-xs text-gray-500 text-center">
                  Google Authenticator等で認証します
                </span>
              </button>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-transparent border border-gray-800 text-gray-800 rounded-md hover:bg-gray-100 mt-2"
            >
              閉じる
            </button>
          </div>
        )}

        {/* メール認証確認画面 */}
        {isFeatureAvailable && step === "email-confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              ログイン時に登録されたメールアドレス宛に認証コードが届くようになります。
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setError("");
                  setStep(getBackStep());
                }}
                className="px-4 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100"
              >
                戻る
              </button>
              <button
                onClick={enableEmail}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "設定中..." : "設定を完了する"}
              </button>
            </div>
          </div>
        )}

        {/* TOTP: QRコード表示＋認証コード入力 */}
        {isFeatureAvailable && step === "totp-setup" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              スマートフォンのGoogle Authenticator、
              またはAuthyアプリでQRコードをスキャンしてください
            </p>
            {qrCodeUrl && (
              <div className="flex justify-center py-2">
                <QRCodeCanvas value={qrCodeUrl} size={160} />
              </div>
            )}
            <div>
              <label
                htmlFor="verification-code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                認証コードを入力
              </label>
              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6桁のコード"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setVerificationCode(val);
                  if (val.length === 6) {
                    verifyAndEnableTotp(val);
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-md text-center text-lg tracking-widest"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setError("");
                  setStep(getBackStep());
                }}
                className="px-4 py-2 bg-transparent border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100"
              >
                戻る
              </button>
              <button
                onClick={() => verifyAndEnableTotp()}
                disabled={isSubmitting || verificationCode.length < 6}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? "確認中..." : "確認して登録"}
              </button>
            </div>
          </div>
        )}

        {/* パターンB: メール認証設定済み */}
        {isFeatureAvailable && step === "current-email" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              現在の設定:{" "}
              <span className="font-bold">メール認証</span>
            </p>
            <p className="text-sm text-gray-500">
              別の認証方法に変更することができます。
            </p>
            <button
              onClick={startTotpSetup}
              disabled={isSubmitting}
              className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-gray-300 p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium text-sm">認証アプリに変更する</span>
            </button>
            <button
              onClick={disableMfa}
              disabled={isSubmitting}
              className="w-full py-3 bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              多要素認証を解除する
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-transparent border border-gray-800 text-gray-800 rounded-md hover:bg-gray-100"
            >
              閉じる
            </button>
          </div>
        )}

        {/* パターンC: TOTP設定済み */}
        {isFeatureAvailable && step === "current-totp" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              現在の設定:{" "}
              <span className="font-bold">認証アプリ</span>
            </p>
            <p className="text-sm text-gray-500">
              別の認証方法に変更、または認証アプリを再登録できます。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setError("");
                  setStep("email-confirm");
                }}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-gray-300 p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-sm">メール認証に変更</span>
              </button>
              <button
                onClick={startTotpSetup}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-gray-300 p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium text-sm">アプリを再登録</span>
              </button>
            </div>
            <button
              onClick={disableMfa}
              disabled={isSubmitting}
              className="w-full py-3 bg-white text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              多要素認証を解除する
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-transparent border border-gray-800 text-gray-800 rounded-md hover:bg-gray-100"
            >
              閉じる
            </button>
          </div>
        )}

        {/* 完了画面 */}
        {isFeatureAvailable && step === "done" && (
          <div className="space-y-4 text-center py-2">
            <svg
              className="w-12 h-12 text-green-600 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">多要素認証が設定されました</p>
            <p className="text-sm text-gray-500">
              次回のログインから認証が必要になります。
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-transparent border border-gray-800 text-gray-800 rounded-md hover:bg-gray-100 mt-2"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMfaSettingDialog;
