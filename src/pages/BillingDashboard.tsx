import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_ENDPOINT, LOGIN_URL } from "../const";
import { idTokenCheck, randomUnixBetween, handleUserListClick } from "../utils";
import {
  BillingDashboardData,
  MeteringUnitBilling,
  PlanPeriodOption,
  UserInfo,
  Tenant,
} from "../types";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
const BillingDashboard = () => {
  const [billingData, setBillingData] = useState<BillingDashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [tenantUserInfo, setTenantUserInfo] = useState<Tenant | null>(null);
  const [roleName, setRoleName] = useState<string>("");
  const [periodOptions, setPeriodOptions] = useState<PlanPeriodOption[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{
    planId: string;
    start: number;
    end: number;
  } | null>(null);
  /** ▼ モーダル用 state */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [meterOptions, setMeterOptions] = useState<MeteringUnitBilling[]>([]);
  const [selectedMeterName, setSelectedMeterName] = useState<string>("");
  const [currentCount, setCurrentCount] = useState<number>(0);
  const [delta, setDelta] = useState<number>(0);
  const [backendError, setBackendError] = useState<boolean>(false);
  /** ネットワーク断 / CORS / 未実装 をまとめて true 判定 */
  const isBackendUnavailable = (err: any) => {
    // err.response が無い → CORS プレフライト失敗 or ネットワーク
    if (!err?.response) return true;
    // 未実装 501, ゲートウェイ 502, サーバ停止 503/504 など
    return [404, 501, 502, 503, 504].includes(err.response.status);
  };
  const navigate = useNavigate();
  let jwtToken = window.localStorage.getItem("SaaSusIdToken") as string;
  const location = useLocation();
  const pagePath = location.pathname;
  // ページ内で共通して使用するヘッダーを定義
  const commonHeaders = {
    "X-Requested-With": "XMLHttpRequest",
    Authorization: `Bearer ${jwtToken}`,
    "X-SaaSus-Referer": pagePath, // すべてのAPIでこの共通のパスを使用
  };
  const getMeteringActionHeaders = (actionName: string, isAdd: boolean, value: number) => {
    const method = isAdd ? "add" : "sub";
    return {
      ...commonHeaders,
      "X-SaaSus-Referer": `${pagePath}?action=${actionName}&method=${method}&value=${value}`,
    };
  };

  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get("tenant_id");

  // 権限チェック
  const checkAccess = () => {
    if (!["admin", "sadmin"].includes(roleName)) {
      navigate("/tenants");
      return false;
    }
    return true;
  };

  // ログインユーザの情報を取得
  const getUserinfo = async () => {
    if (!tenantId) return;

    try {
      const res = await axios.get<UserInfo>(`${API_ENDPOINT}/userinfo`, {
        headers: commonHeaders,
        withCredentials: true,
      });

      const tenant = res.data.tenants.find(
        (tenant: Tenant) => tenant.id === tenantId
      );

      if (tenant) {
        const roleName = tenant.envs[0]?.roles[0]?.role_name || "";
        setTenantUserInfo(tenant);
        setRoleName(roleName);
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      window.location.href = LOGIN_URL;
    }
  };
  // 課金データを取得し、メータリングの重複を排除して state を更新
  const getBillingData = async (
    planId: string,
    periodStart: number,
    periodEnd: number
  ) => {
    setLoading(true);

    try {
      const params = {
        tenant_id: tenantId,
        plan_id: planId,
        period_start: periodStart,
        period_end: periodEnd,
      };

      const { data } = await axios.get<BillingDashboardData>(
        `${API_ENDPOINT}/billing/dashboard`,
        {
          headers: commonHeaders,
          withCredentials: true,
          params,
        }
      );

      console.log("Billing API response:", data);
      setBillingData(data);

      /* ---------- ① 重複排除 ---------- */
      const seen = new Set<string>();
      const uniqueMeters: MeteringUnitBilling[] = [];
      for (const u of data.metering_unit_billings) {
        if (u.metering_unit_type !== "fixed" && !seen.has(u.metering_unit_name)) {
          seen.add(u.metering_unit_name);
          uniqueMeters.push(u);
        }
      }
      setMeterOptions(uniqueMeters);

      /* ---------- ② 選択中メータが無効ならデフォルト ---------- */
      const fallbackName =
        uniqueMeters.length > 0 ? uniqueMeters[0].metering_unit_name : "";

      const nextMeterName = uniqueMeters.some(
        (u) => u.metering_unit_name === selectedMeterName
      )
        ? selectedMeterName
        : fallbackName;

      setSelectedMeterName(nextMeterName);

      /* ---------- ③ 現在カウントを最新値へ ---------- */
      const current = uniqueMeters.find(
        (u) => u.metering_unit_name === nextMeterName
      )?.period_count;
      setCurrentCount(current ?? 0);
    } catch (error: any) {
      if (isBackendUnavailable(error)) setBackendError(true);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  /** メータを増減する (isAdd=true なら加算, false なら減算) */
  const updateMeter = async (isAdd: boolean) => {
    if (!tenantId || !selectedMeterName || delta <= 0 || !selectedPeriod)
      return;

    const nowUnix = Math.floor(Date.now() / 1000);
    const end = Math.min(selectedPeriod.end, nowUnix);
    // 期間内のランダム秒を生成
    const ts = randomUnixBetween(selectedPeriod.start, end);

    try {
      await axios.post(
        `${API_ENDPOINT}/billing/metering/${tenantId}/${selectedMeterName}/${ts}`,
        {
          method: isAdd ? "add" : "sub",
          count: delta,
        },
        {
          headers: getMeteringActionHeaders("update_meter", isAdd, delta),
        }
      );

      // 更新後に最新情報を取得
      await getBillingData(
        selectedPeriod.planId,
        selectedPeriod.start,
        selectedPeriod.end
      );
      setDelta(0);
    } catch (err) {
      console.error(err);
      alert("メータ更新に失敗しました");
    }
  };
  const fetchPeriodOptions = async () => {
    try {
      const res = await axios.get<PlanPeriodOption[]>(
        `${API_ENDPOINT}/billing/plan_periods`,
        {
          headers: commonHeaders,
          params: { tenant_id: tenantId },
        }
      );
      setBackendError(false);
      if (res.data.length > 0) {
        setPeriodOptions(res.data);
        const defaultPeriod = res.data[0];
        setSelectedPeriod({
          planId: defaultPeriod.plan_id,
          start: defaultPeriod.start,
          end: defaultPeriod.end,
        });
      } else {
        setPeriodOptions([]);
        setSelectedPeriod(null);
        setLoading(false);
      }
    } catch (error) {
      if (isBackendUnavailable(error)) setBackendError(true);
      console.error(error);
      setLoading(false); // エラー時にも解除
    }
  };

  const updateMeterInline = async (
    meterName: string,
    isAdd: boolean,
    count: number
  ) => {
    if (!tenantId || !selectedPeriod) return;
    if (count <= 0) return;

    const nowUnix = Math.floor(Date.now() / 1000);
    const end = Math.min(selectedPeriod.end, nowUnix);
    const ts = randomUnixBetween(selectedPeriod.start, end);

    try {
      await axios.post(
        `${API_ENDPOINT}/billing/metering/${tenantId}/${meterName}`,
        {
          method: isAdd ? "add" : "sub",
          count,
        },
        {
          headers: getMeteringActionHeaders("update_meter_inline", isAdd, count),
        }
      );

      // 更新後に最新データ取得
      await getBillingData(
        selectedPeriod.planId,
        selectedPeriod.start,
        selectedPeriod.end
      );
    } catch (err) {
      console.error(err);
      alert("メータ更新に失敗しました");
    }
  };

  useEffect(() => {
    if (jwtToken && tenantId) {
      fetchPeriodOptions();
    }
  }, [jwtToken, tenantId]);
  useEffect(() => {
    const initializePage = async () => {
      await idTokenCheck(jwtToken);
      await getUserinfo();
    };
    initializePage();
  }, []);

  useEffect(() => {
    if (roleName && checkAccess() && periodOptions.length > 0) {
      if (!selectedPeriod) {
        const defaultPeriod = periodOptions[0];
        const target = {
          planId: defaultPeriod.plan_id,
          start: defaultPeriod.start,
          end: defaultPeriod.end,
        };
        setSelectedPeriod(target);
        getBillingData(target.planId, target.start, target.end);
      } else {
        getBillingData(
          selectedPeriod.planId,
          selectedPeriod.start,
          selectedPeriod.end
        );
      }
    }
  }, [roleName, selectedPeriod, periodOptions]);

  const buildMeteringReferer = (
    prefix: string,
    isAdd: boolean,
    count: number
  ): string => {
    // ["add",3] or ["sub",1] という配列を文字列化
    const payload = JSON.stringify([isAdd ? "add" : "sub", count]);
    return `${prefix}:${payload}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case "JPY":
        return "¥";
      case "USD":
        return "$";
      default:
        return currency;
    }
  };

  if (backendError) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-600">
            ネットワークエラー、CORS
            制限、またはバックエンドが未実装の可能性があります。
          </div>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!billingData && periodOptions.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">
            プランが未設定です（請求情報がありません）
          </div>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-600">課金データの取得に失敗しました</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ページタイトル */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          💰 課金情報ダッシュボード
        </h1>
        <p className="text-gray-600 mt-1">テナント: {tenantUserInfo?.name}</p>
      </div>

      {/* 表示期間選択 */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label
            htmlFor="period-select"
            className="text-sm font-medium text-gray-700"
          >
            表示期間:
          </label>
          <select
            id="period-select"
            value={selectedPeriod ? JSON.stringify(selectedPeriod) : ""}
            onChange={(event) => {
              const selected = JSON.parse(event.target.value);
              setSelectedPeriod(selected);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {periodOptions.map((option, index) => (
              <option
                key={index}
                value={JSON.stringify({
                  planId: option.plan_id,
                  start: option.start,
                  end: option.end,
                })}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 課金サマリー */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          📊 課金サマリー
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {billingData.summary.total_by_currency.map((currency) => (
            <div key={currency.currency} className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">
                {currency.currency}合計
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {getCurrencySymbol(currency.currency)}
                {formatNumber(currency.total_amount)}
              </div>
            </div>
          ))}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">計測単位</div>
            <div className="text-2xl font-bold text-gray-800">
              {billingData.summary.total_metering_units}項目
            </div>
          </div>
        </div>
      </div>

      {/* 料金プラン情報 */}
      {billingData.pricing_plan_info && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            📋 料金プラン情報
          </h2>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                {billingData.pricing_plan_info.display_name}
              </h3>
            </div>
            {billingData.pricing_plan_info.description && (
              <p className="text-sm text-gray-600 mb-3">
                {billingData.pricing_plan_info.description}
              </p>
            )}

            {/* ▼ 税率情報 */}
            {billingData.tax_rate && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-700 mb-2">
                  税率情報
                </h4>
                <div className="border border-gray-100 p-2 rounded text-sm text-gray-700">
                  <div className="font-medium">
                    {billingData.tax_rate.display_name}
                  </div>
                  <div className="text-gray-500">
                    税率: {billingData.tax_rate.percentage}%（
                    {billingData.tax_rate.inclusive ? "内税" : "外税"}）
                  </div>
                  {billingData.tax_rate.description && (
                    <div className="text-gray-400 text-xs mt-1">
                      {billingData.tax_rate.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 詳細課金情報 */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          📊 計測単位別課金情報
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Function Menu
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  計測単位名
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  メータリング
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  期間内カウント
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  通貨
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  期間内課金額
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {billingData.metering_unit_billings.map((item, index) => {
                const now = Math.floor(Date.now() / 1000);
                const isCurrentPeriod =
                  selectedPeriod &&
                  selectedPeriod.start <= now &&
                  now <= selectedPeriod.end;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{item.function_menu_name}</td>
                    <td className="py-3 px-4 font-medium">
                      {item.pricing_unit_display_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-600">
                      {item.metering_unit_name}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="min-w-[3.5rem] text-center font-mono text-gray-800">
                          {item.metering_unit_type !== "fixed"
                            ? formatNumber(item.period_count)
                            : "–"}
                        </span>
                        {item.metering_unit_type !== "fixed" &&
                          isCurrentPeriod && (
                            <>
                              <button
                                onClick={() =>
                                  updateMeterInline(
                                    item.metering_unit_name,
                                    true,
                                    1
                                  )
                                }
                                className="w-6 h-6 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded"
                                title="1加算"
                              >
                                ＋
                              </button>
                              <button
                                onClick={() =>
                                  updateMeterInline(
                                    item.metering_unit_name,
                                    false,
                                    1
                                  )
                                }
                                className="w-6 h-6 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded"
                                title="1減算"
                              >
                                −
                              </button>
                            </>
                          )}
                      </div>
                    </td>

                    <td className="py-3 px-4">{item.currency}</td>
                    <td className="py-3 px-4 font-semibold">
                      {getCurrencySymbol(item.currency)}
                      {formatNumber(item.period_amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        {/* ▼ 注意書き */}
      <div className="mt-2">
        <span className="ml-2 text-red-600 text-sm">
          ※Stripe連携を行っている場合、減算や過去のメータに対する変更はできません。
        </span>
      </div>
      {/* ▼ メータ更新ボタン */}
      {meterOptions.length > 0 && (
        <div className="flex justify-end mt-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow"
          >
            メータ更新
          </button>
        </div>
      )}

      {/* ▼ モーダル */}
      <Transition show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold">
                    メータ更新
                  </Dialog.Title>
                  <button onClick={() => setIsModalOpen(false)}>
                    <XMarkIcon className="h-6 w-6 text-gray-500" />
                  </button>
                </div>

                {/* 計測単位選択 */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メータリング:
                </label>
                <select
                  className="w-full mb-4 border rounded px-3 py-2"
                  value={selectedMeterName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedMeterName(name);
                    const m = meterOptions.find(
                      (u) => u.metering_unit_name === name
                    );
                    setCurrentCount(m ? m.period_count : 0);
                  }}
                >
                  {meterOptions.map((u) => (
                    <option
                      key={u.metering_unit_name}
                      value={u.metering_unit_name}
                    >
                      {u.metering_unit_name}
                    </option>
                  ))}
                </select>

                {/* 現在カウント */}
                <p className="mb-4">
                  <span className="text-sm text-gray-600">現在カウント:</span>{" "}
                  <span className="text-xl font-semibold">
                    {formatNumber(currentCount)}
                  </span>
                </p>

                {/* 増減値入力 */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  増減量:
                </label>
                <input
                  type="number"
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                  className="w-full border rounded px-3 py-2 mb-4"
                  min={0}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => updateMeter(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                    disabled={delta <= 0}
                  >
                    add
                  </button>
                  <button
                    onClick={() => updateMeter(false)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded"
                    disabled={delta <= 0}
                  >
                    sub
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* ユーザー一覧へ戻るボタン */}
      <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={() => handleUserListClick(tenantId!, navigate)}
          className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg shadow"
        >
          ユーザー一覧に戻る
        </button>
      </div>
    </div>
  );
};

export default BillingDashboard;
