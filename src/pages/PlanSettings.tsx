import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINT } from "../const";
import { idTokenCheck, navigateToUserPageByRole } from "../utils";
import { Tenant } from "../types";
import { PlanInfo, TaxRate, PricingPlan } from "../types/billing";

// 定数定義
const PLAN_SETTINGS_CONSTANTS = {
  DELAYS: {
    PLAN_CHANGE_SECONDS: 300, // 5分
    EDIT_LOCK_THRESHOLD_SECONDS: 600, // 10分
  },
  MESSAGES: {
    PLAN_UPDATE_SUCCESS: "プランの変更が完了しました。",
    PLAN_UPDATE_ERROR: "プラン更新に失敗しました。",
    PLAN_CANCEL_ERROR: "プラン解除に失敗しました。",
    RESERVATION_CANCEL_ERROR: "予約取り消しに失敗しました。",
    TENANT_INFO_ERROR: "テナント情報の取得に失敗しました。",
    PRICING_PLANS_ERROR: "プラン一覧の取得に失敗しました。",
    TAX_RATES_ERROR: "税率一覧の取得に失敗しました。",
    MISSING_TENANT_OR_PLAN: "テナントIDまたはプランIDが設定されていません。",
    NOT_IMPLEMENTED: "この機能はまだ実装されていません。",
    NETWORK_ERROR: "ネットワークエラー、CORS制限、またはこの機能が未実装の可能性があります。",
  },
  UI: {
    IMMEDIATE_LABEL: "すぐ反映（5分後）",
    CUSTOM_LABEL: "日時指定",
    UNSELECTED: "未選択",
    LOADING: "読み込み中...",
  }
} as const;

// プラン更新データの型定義
interface PlanUpdateData {
  next_plan_id: string;
  tax_rate_id?: string;
  using_next_plan_from?: number;
}

// APIエラーレスポンスの型定義（複数形式対応）
interface ApiErrorResponse {
  response?: {
    status?: number;     // HTTPステータスコード
    data?: {
      error?: string;    // Go形式: {"error": "message"}
      detail?: string;   // FastAPI形式: {"detail": "message"}
      message?: string;  // その他の形式: {"message": "message"}
    };
  };
  message?: string;
}

const PlanSettings = () => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanInfo | null>(null);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>("");
  const [usingNextPlanFrom, setUsingNextPlanFrom] = useState<string>("immediate");
  const [customDate, setCustomDate] = useState<string>("");
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [showReservationCancelModal, setShowReservationCancelModal] = useState<boolean>(false);
  const [reservationCancelLoading, setReservationCancelLoading] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const pagePath = location.pathname;
  const jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;

  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${jwtToken}`,
    "X-SaaSus-Referer": pagePath,
  };

  const getActionHeaders = (actionName: string) => {
    return {
      ...commonHeaders,
      "X-SaaSus-Referer": `${pagePath}?action=${actionName}`,
    };
  };

  // テナント情報取得（予約情報含む）
  const getTenantInfo = async (tenantId: string) => {
    try {
      const tenantDetailRes = await axios.get(`${API_ENDPOINT}/tenants/${tenantId}/plan`, {
        headers: commonHeaders,
        withCredentials: true,
      });
      
      if (tenantDetailRes.data) {
        const detailedTenant = tenantDetailRes.data;
        setTenantInfo(detailedTenant);
        
        // 現在のプラン情報を取得
        if (detailedTenant.plan_id) {
          const planRes = await axios.get<PlanInfo>(`${API_ENDPOINT}/pricing_plan`, {
            headers: commonHeaders,
            withCredentials: true,
            params: { plan_id: detailedTenant.plan_id },
          });
          setCurrentPlan(planRes.data);
        }
      }
    } catch (error) {
      console.error("テナント情報の取得に失敗しました:", error);
      const errorMessage = handleApiError(error, PLAN_SETTINGS_CONSTANTS.MESSAGES.TENANT_INFO_ERROR);
      showError(errorMessage);
    }
  };

  // プラン一覧取得
  const getPricingPlans = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINT}/pricing_plans`, {
        headers: commonHeaders,
        withCredentials: true,
      });
      
      if (response.data && Array.isArray(response.data)) {
        setPricingPlans(response.data);
      } else {
        setPricingPlans([]);
      }
    } catch (error) {
      console.error("プラン一覧の取得に失敗しました:", error);
      const errorMessage = handleApiError(error, PLAN_SETTINGS_CONSTANTS.MESSAGES.PRICING_PLANS_ERROR);
      showError(errorMessage);
      setPricingPlans([]);
    }
  };

  // 税率一覧取得
  const getTaxRates = async () => {
    try {
      const response = await axios.get(`${API_ENDPOINT}/tax_rates`, {
        headers: commonHeaders,
        withCredentials: true,
      });
      
      if (response.data && Array.isArray(response.data)) {
        setTaxRates(response.data);
      } else {
        setTaxRates([]);
      }
    } catch (error) {
      console.error("税率一覧の取得に失敗しました:", error);
      const errorMessage = handleApiError(error, PLAN_SETTINGS_CONSTANTS.MESSAGES.TAX_RATES_ERROR);
      showError(errorMessage);
      setTaxRates([]);
    }
  };

  // 最新のテナント情報を再取得
  const refreshTenantInfo = async () => {
    if (tenantId) {
      await getTenantInfo(tenantId);
    }
  };

  // エラー表示の統一処理
  const showError = (message: string) => {
    alert(message); // 後でトーストやモーダルに置き換え可能
  };

  // 汎用エラーハンドリング関数
  const handleApiError = (error: unknown, fallbackMessage: string): string => {
    const apiError = error as ApiErrorResponse;
    
    // ネットワークエラーまたはレスポンスなしの場合
    if (!apiError.response) {
      return PLAN_SETTINGS_CONSTANTS.MESSAGES.NETWORK_ERROR;
    }
    
    // 404エラーの場合（未実装機能）
    if (apiError.response.status === 404) {
      return PLAN_SETTINGS_CONSTANTS.MESSAGES.NOT_IMPLEMENTED;
    }
    
    // APIエラーメッセージの優先順位（複数形式対応）
    if (apiError.response.data?.error) {
      // Go形式: {"error": "message"}
      return apiError.response.data.error;
    }
    
    if (apiError.response.data?.detail) {
      // FastAPI形式: {"detail": "message"}
      return apiError.response.data.detail;
    }
    
    if (apiError.response.data?.message) {
      // その他の形式: {"message": "message"}
      return apiError.response.data.message;
    }
    
    if (apiError.message) {
      return apiError.message;
    }
    
    // フォールバックメッセージ
    return fallbackMessage;
  };

  // プラン更新データの作成
  const buildPlanUpdateData = (): PlanUpdateData => {
    const updateData: PlanUpdateData = {
      next_plan_id: selectedPlanId,
    };

    // 税率IDが指定されている場合のみ設定
    if (selectedTaxRateId) {
      updateData.tax_rate_id = selectedTaxRateId;
    }

    // カスタム日時が指定されている場合のみ using_next_plan_from を設定
    if (usingNextPlanFrom === "custom" && customDate) {
      updateData.using_next_plan_from = Math.floor(new Date(customDate).getTime() / 1000);
    }

    return updateData;
  };

  // プラン更新の入力値検証
  const validatePlanUpdateInput = (): boolean => {
    if (!tenantId || !selectedPlanId) {
      showError(PLAN_SETTINGS_CONSTANTS.MESSAGES.MISSING_TENANT_OR_PLAN);
      return false;
    }
    return true;
  };

  // プラン更新APIの実行
  const executePlanUpdate = async (updateData: PlanUpdateData): Promise<void> => {
    await axios.put(`${API_ENDPOINT}/tenants/${tenantId}/plan`, updateData, {
      headers: getActionHeaders("plan_update"),
      withCredentials: true,
    });
  };

  // プラン更新処理
  const handlePlanUpdate = async () => {
    // 入力値検証
    if (!validatePlanUpdateInput()) {
      return;
    }

    setUpdateLoading(true);
    try {
      // 更新データの作成
      const updateData = buildPlanUpdateData();
      
      // API実行
      await executePlanUpdate(updateData);

      // 成功時の処理
      setUpdateLoading(false);
      setShowConfirmModal(false);
      setShowCompletedModal(true);
    } catch (error) {
      console.error("プラン更新に失敗しました:", error);
      
      // エラーメッセージの抽出と表示
      const errorMessage = handleApiError(error, PLAN_SETTINGS_CONSTANTS.MESSAGES.PLAN_UPDATE_ERROR);
      showError(errorMessage);
      
      setUpdateLoading(false);  
    }
  };

  useEffect(() => {
    const startPlanSettings = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantIdFromQuery = urlParams.get("tenant_id");
      
      if (!tenantIdFromQuery) {
        navigate("/");
        return;
      }

      setTenantId(tenantIdFromQuery);
      await idTokenCheck(jwtToken);
      await getTenantInfo(tenantIdFromQuery);
      await getPricingPlans();
      await getTaxRates();
    };
    
    startPlanSettings();
  }, []);

  const getPlanDisplayName = (planId: string) => {
    if (!planId) return PLAN_SETTINGS_CONSTANTS.UI.UNSELECTED;
    const plan = pricingPlans.find(p => p && p.id === planId);
    return plan ? (plan.display_name || plan.name || plan.id) : PLAN_SETTINGS_CONSTANTS.UI.LOADING;
  };

  const getTaxRateDisplayName = (taxRateId: string) => {
    if (!taxRateId) return PLAN_SETTINGS_CONSTANTS.UI.UNSELECTED;
    const taxRate = taxRates.find(tr => tr.id === taxRateId);
    return taxRate ? `${taxRate.display_name} (${taxRate.percentage}%)` : PLAN_SETTINGS_CONSTANTS.UI.LOADING;
  };

  // 編集可能かどうかの判定（変更予定日時が現在日時と10分差ない場合は編集不可）
  const canEdit = (): boolean => {
    if (!tenantInfo?.plan_reservation?.using_next_plan_from) {
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = tenantInfo.plan_reservation.using_next_plan_from - now;
    
    // 変更予定日時が現在日時と10分差ない場合は、編集不可
    if (timeDiff < PLAN_SETTINGS_CONSTANTS.DELAYS.EDIT_LOCK_THRESHOLD_SECONDS) {
      return false;
    }
    return true;
  };

  // プラン解除ボタンの表示条件
  const cancelButtonIsVisible = (): boolean => {
    // 現在のプランなし
    if (!tenantInfo?.plan_id) {
      return false;
    }
    
    // すでにプランが解除予定になっている場合は、非表示
    if (!tenantInfo.plan_reservation?.next_plan_id && tenantInfo.plan_reservation?.using_next_plan_from) {
      return false;
    }
    
    return true;
  };

  // 変更予定削除ボタンの表示条件
  const deleteScheduleButtonIsVisible = (): boolean => {
    // 変更予定日時がない場合は、非表示
    if (!tenantInfo?.plan_reservation?.using_next_plan_from) {
      return false;
    }
    
    return true;
  };

  // プラン解除処理
  const handlePlanCancel = async () => {
    if (!tenantId) return;
    
    setCancelLoading(true);
    try {
      // プラン解除時は5分後に設定
      const usingNextPlanFrom = Math.floor(Date.now() / 1000) + PLAN_SETTINGS_CONSTANTS.DELAYS.PLAN_CHANGE_SECONDS;
      
      await axios.put(
        `${API_ENDPOINT}/tenants/${tenantId}/plan`,
        {
          next_plan_id: "",
          using_next_plan_from: usingNextPlanFrom,
        },
        {
          headers: getActionHeaders("plan_cancel"),
          withCredentials: true,
        }
      );
      setShowCancelModal(false);
      await refreshTenantInfo();
    } catch (error) {
      console.error("プラン解除に失敗しました:", error);
      const errorMessage = handleApiError(error, PLAN_SETTINGS_CONSTANTS.MESSAGES.PLAN_CANCEL_ERROR);
      showError(errorMessage);
    }
    setCancelLoading(false);
  };

  // 予約取り消し処理
  const handleReservationCancel = async () => {
    if (!tenantId) return;
    
    setReservationCancelLoading(true);
    try {
      // 予約を取り消すために、プラン更新APIを空のリクエストボディで呼び出す
      await axios.put(
        `${API_ENDPOINT}/tenants/${tenantId}/plan`,
        {},
        {
          headers: getActionHeaders("reservation_cancel"),
          withCredentials: true,
        }
      );
      setShowReservationCancelModal(false);
      await refreshTenantInfo();
    } catch (error) {
      console.error("予約取り消しに失敗しました:", error);
      const errorMessage = handleApiError(error, PLAN_SETTINGS_CONSTANTS.MESSAGES.RESERVATION_CANCEL_ERROR);
      showError(errorMessage);
    }
    setReservationCancelLoading(false);
  };

  // ロールに応じたナビゲーション
  const navigateToUserPage = async () => {
    if (!tenantId) return;
    await navigateToUserPageByRole(tenantId, navigate, pagePath);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">プラン設定</h1>
        <p className="text-gray-600 mt-2">テナントの料金プランを変更できます。</p>
        
        {/* 編集不可の場合の説明をページ上部に1箇所のみ表示 */}
        {!canEdit() && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-800">
                  <strong>編集制限中:</strong> 変更予定が10分以内のため、プラン設定・解除・予約取り消しができません。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 現在のプラン情報 */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">現在のプラン</h2>
          {/* プラン解除ボタン: SaaSus Platformと同じ制御 */}
          {cancelButtonIsVisible() && canEdit() && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              プラン解除
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-600">現在のプラン：</span>
            <span>{currentPlan?.display_name || "未設定"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">現在の税率：</span>
            <span>
              {tenantInfo?.tax_rate_id 
                ? getTaxRateDisplayName(tenantInfo.tax_rate_id)
                : "未設定"
              }
            </span>
          </div>
          {/* 予約情報の表示 */}
          {tenantInfo?.plan_reservation && (
            <>
              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-blue-800">プラン変更予約</h3>
                    {/* 予約取り消しボタン: SaaSus Platformと同じ制御 */}
                    {deleteScheduleButtonIsVisible() && canEdit() && (
                      <button
                        onClick={() => setShowReservationCancelModal(true)}
                        className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
                      >
                        予約取り消し
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-blue-700">予約プラン：</span>
                      <span>{getPlanDisplayName(tenantInfo.plan_reservation.next_plan_id || "")}</span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">変更予定日時：</span>
                      <span>
                        {tenantInfo.plan_reservation.using_next_plan_from 
                          ? new Date(tenantInfo.plan_reservation.using_next_plan_from * 1000).toLocaleString('ja-JP')
                          : "未設定"
                        }
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-blue-700">変更予定税率：</span>
                      <span>
                        {tenantInfo.plan_reservation.next_plan_tax_rate_id 
                          ? getTaxRateDisplayName(tenantInfo.plan_reservation.next_plan_tax_rate_id)
                          : "未設定"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* プラン変更フォーム */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">プラン変更</h2>
        </div>
        
        <div className="space-y-4">
          {/* プラン選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新しいプラン
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              disabled={!canEdit()}
              className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !canEdit() ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">プランを選択してください</option>
              {pricingPlans.length > 0 ? (
                pricingPlans.map((plan) => {
                  if (!plan || !plan.id) {
                    return null;
                  }
                  return (
                    <option key={plan.id} value={plan.id}>
                      {plan.display_name || plan.name || plan.id} - {plan.description || "説明なし"}
                    </option>
                  );
                }).filter(Boolean)
              ) : (
                <option value="" disabled>プランが見つかりません</option>
              )}
            </select>
          </div>

          {/* 税率選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              税率
            </label>
            <select
              value={selectedTaxRateId}
              onChange={(e) => setSelectedTaxRateId(e.target.value)}
              disabled={!canEdit()}
              className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !canEdit() ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">使用しない</option>
              {taxRates.length > 0 ? (
                taxRates.map((taxRate) => (
                  <option key={taxRate.id} value={taxRate.id}>
                    {taxRate.display_name} ({taxRate.percentage}%)
                  </option>
                ))
              ) : (
                <option value="" disabled>税率が見つかりません</option>
              )}
            </select>
          </div>

          {/* 反映び */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              反映日
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="immediate"
                  checked={usingNextPlanFrom === "immediate"}
                  onChange={(e) => setUsingNextPlanFrom(e.target.value)}
                  disabled={!canEdit()}
                  className="mr-2"
                />
                {PLAN_SETTINGS_CONSTANTS.UI.IMMEDIATE_LABEL}
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="custom"
                  checked={usingNextPlanFrom === "custom"}
                  onChange={(e) => setUsingNextPlanFrom(e.target.value)}
                  disabled={!canEdit()}
                  className="mr-2"
                />
                {PLAN_SETTINGS_CONSTANTS.UI.CUSTOM_LABEL}
              </label>
            </div>
            
            {usingNextPlanFrom === "custom" && (
              <div className="mt-2">
                <input
                  type="datetime-local"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  disabled={!canEdit()}
                  className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !canEdit() ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={navigateToUserPage}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              戻る
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!canEdit() || !selectedPlanId || (usingNextPlanFrom === "custom" && !customDate)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              プランを変更
            </button>
          </div>
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              プラン変更の確認
            </h3>
            <div className="space-y-2 mb-6">
              <p className="text-gray-600">
                <span className="font-medium">新しいプラン：</span>
                {getPlanDisplayName(selectedPlanId)}
              </p>
              {selectedTaxRateId && (
                <p className="text-gray-600">
                  <span className="font-medium">税率：</span>
                  {getTaxRateDisplayName(selectedTaxRateId)}
                </p>
              )}
              <p className="text-gray-600">
                <span className="font-medium">反映日：</span>
                {usingNextPlanFrom === "immediate" 
                  ? PLAN_SETTINGS_CONSTANTS.UI.IMMEDIATE_LABEL
                  : `${PLAN_SETTINGS_CONSTANTS.UI.CUSTOM_LABEL}（${customDate}）`
                }
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                disabled={updateLoading}
              >
                戻る
              </button>
              <button
                onClick={handlePlanUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={updateLoading}
              >
                {updateLoading ? "処理中..." : "変更する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完了モーダル */}
      {showCompletedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              プラン変更完了
            </h3>
            <p className="text-gray-600 mb-6">
              {PLAN_SETTINGS_CONSTANTS.MESSAGES.PLAN_UPDATE_SUCCESS}
              {usingNextPlanFrom === "immediate" 
                ? "5分後に新しいプランが適用されます。" 
                : `指定した日時に新しいプランが適用されます。`
              }
            </p>
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  setShowCompletedModal(false);
                  await refreshTenantInfo();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* プラン解除確認モーダル */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              プラン解除の確認
            </h3>
            <p className="text-gray-600 mb-6">
              プランを解除すると、5分後に現在のプランが利用できなくなります。
              本当に解除しますか？
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                disabled={cancelLoading}
              >
                戻る
              </button>
              <button
                onClick={handlePlanCancel}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={cancelLoading}
              >
                {cancelLoading ? "処理中..." : "解除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 予約取り消し確認モーダル */}
      {showReservationCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              予約取り消しの確認
            </h3>
            <p className="text-gray-600 mb-6">
              プラン変更予約を取り消しますか？
              取り消すと、現在のプランが継続されます。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReservationCancelModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                disabled={reservationCancelLoading}
              >
                戻る
              </button>
              <button
                onClick={handleReservationCancel}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                disabled={reservationCancelLoading}
              >
                {reservationCancelLoading ? "処理中..." : "取り消す"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSettings;