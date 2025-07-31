// 共通の型定義

/**
 * APIエラーの型定義
 */
export interface ApiError extends Error {
  response?: {
    status: number;
    data: any;
  };
}

/**
 * ロール情報の型定義
 */
export interface Role {
  role_name: string;
  display_name: string;
  id?: string;
}

/**
 * 環境情報の型定義
 */
export interface Environment {
  envs_id: string;
  roles: Role[];
}

/**
 * ユーザー属性の型定義
 */
export interface UserAttribute {
  attribute_name: string;
  display_name: string;
  attribute_type: "text" | "number" | "bool" | "date";
  required: boolean;
}

/**
 * ユーザー属性値の型定義
 */
export interface UserAttributeValues {
  [key: string]: string | number | boolean | Date | undefined;
  name?: string;
}

/**
 * ユーザー属性のレスポンス型
 */
export interface UserAttributesResponse {
  user_attributes: Record<string, UserAttribute>;
}

/**
 * テナント属性の型定義
 */
export interface TenantAttribute {
  attribute_name: string;
  display_name: string;
  attribute_type: string;
  required: boolean;
  value?: string | number | boolean;
}

/**
 * テナント属性値の型定義
 */
export interface TenantAttributeValues {
  [key: string]: string | number | boolean | Date;
}

/**
 * テナント属性のレスポンス型
 * APIのレスポンス構造に合わせて二通りのパターンに対応
 */
export interface TenantAttributesResponse {
  // インデックスシグネチャを直接TenantAttribute型に割り当てるケース
  [key: string]: TenantAttribute | Record<string, TenantAttribute> | undefined;
  // 一部のAPIレスポンスではtenant_attributesキーの下に属性が格納されるケース
  tenant_attributes?: Record<string, TenantAttribute>;
}

/**
 * テナント情報の型定義
 */
export interface Tenant {
  id: string;
  name: string;
  envs: Environment[];
  plan_id?: string;
  user_attribute?: UserAttributeValues;
}

/**
 * ユーザー情報の型定義
 */
export interface User {
  id: string;
  tenant_id: string;
  email: string;
  attributes?: UserAttributeValues;
}

/**
 * ユーザー情報レスポンスの型定義
 */
export interface UserInfo {
  id?: string;
  email: string;
  tenants: Tenant[];
}

/**
 * 削除されたユーザーの型定義
 */
export interface DeletedUser {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  delete_at: string;
}

/**
 * 招待情報の型定義
 */
export interface Invitation {
  id: string;
  email: string;
  invitation_url: string;
  status: string;
  expired_at?: number;
  envs?: Environment[];
}

/**
 * プラン情報の型定義
 */
export interface PlanInfo {
  display_name: string;
  description?: string;
  amount?: number;
  currency?: string;
}

/**
 * MFAステータスレスポンスの型定義
 */
export interface MfaStatusResponse {
  enabled: boolean;
}

/**
 * MFAセットアップレスポンスの型定義
 */
export interface MfaSetupResponse {
  qrCodeUrl: string;
}

// 課金関連の型定義をエクスポート
export * from './billing';
