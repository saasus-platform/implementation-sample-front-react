// 課金関連の型定義

/**
 * 課金サマリーの型定義
 */
export interface BillingSummary {
  // period_display: string; // "2025年1月" - 画面表示用
  total_by_currency: Array<{
    currency: string;
    total_amount: number;
  }>;
  total_metering_units: number;
}

/**
 * 計測単位の課金情報
 */
export interface MeteringUnitBilling {
  metering_unit_name: string;
  metering_unit_type: "usage" | "fixed" | "tiered"| "tiered_usage";
  function_menu_name: string;
  period_count: number;
  currency: string;
  period_amount: number;
  pricing_unit_display_name: string;
}

/**
 * 料金プラン情報の型定義
 */
export interface PricingPlanInfo {
  display_name: string;
  description?: string;
}

/**
 * 課金ダッシュボードデータの型定義
 */
export interface BillingDashboardData {
  summary: BillingSummary;
  metering_unit_billings: MeteringUnitBilling[];
  pricing_plan_info: PricingPlanInfo;
  tax_rate?: TaxRate;
}

export type PlanPeriodOption = {
  label: string;
  plan_id: string;
  start: number;
  end: number;
};

/**
 * 税率情報の型定義
 */
export interface TaxRate {
  id: string;
  display_name: string;
  percentage: number;
  inclusive?: boolean;
  description?: string;
}

/**
 * プラン情報の型定義
 */
export interface PlanInfo {
  display_name: string;
  description?: string;
  tax_rate?: number;
}

/**
 * 料金プランの型定義
 */
export interface PricingPlan {
  id: string;
  display_name: string;
  description: string;
  name: string;
  used: boolean;
  pricing_menus: PricingMenu[];
}

/**
 * 料金メニューの型定義
 */
export interface PricingMenu {
  display_name: string;
  units: PricingUnit[];
}

/**
 * 料金単位の型定義
 */
export interface PricingUnit {
  id: string;
  name: string;
  [key: string]: unknown;
}