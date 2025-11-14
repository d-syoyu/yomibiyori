/**
 * アプリケーション設定
 */

// API Base URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://yomibiyori-production.up.railway.app/api/v1';

// 開発環境判定
export const IS_DEV = __DEV__;

// その他の設定
export const APP_VERSION = '1.0.0';
