/**
 * Error Handling Utility
 * 統一的なエラー処理とユーザーフレンドリーなメッセージ生成
 */

import type { ApiError } from '../types';
import { logger } from './logger';

/**
 * エラータイプ
 */
export enum ErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  FORBIDDEN = 'forbidden',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * エラー情報
 */
export interface ErrorInfo {
  type: ErrorType;
  title: string;
  message: string;
  canRetry: boolean;
}

/**
 * ステータスコードからエラータイプを判定
 */
export function getErrorType(status: number): ErrorType {
  if (status === 0 || status === -1) {
    return ErrorType.NETWORK;
  }

  if (status === 401) {
    return ErrorType.AUTH;
  }

  if (status === 403) {
    return ErrorType.FORBIDDEN;
  }

  if (status === 404) {
    return ErrorType.NOT_FOUND;
  }

  if (status === 409) {
    return ErrorType.CONFLICT;
  }

  if (status === 422) {
    return ErrorType.VALIDATION;
  }

  if (status === 429) {
    return ErrorType.RATE_LIMIT;
  }

  if (status >= 500) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * エラーメッセージを翻訳・ユーザーフレンドリーな形式に変換
 */
export function translateErrorMessage(detail: string, type: ErrorType): string {
  // 既知のエラーメッセージのマッピング
  const messageMap: Record<string, string> = {
    'Network error - please check your connection': 'ネットワークに接続できません\n接続を確認してください',
    'Submissions are closed between 22:00 and 06:00 JST': '投稿時間外です\n投稿は6:00〜22:00の間のみ可能です',
    'You have already submitted a work today for this category': '今日はすでにこのカテゴリに投稿済みです',
    'Theme not found for today': '本日のお題が見つかりません',
    'Work not found': '作品が見つかりません',
    'Theme not found': 'お題が見つかりません',
    'Ranking not available': 'ランキングはまだ作成されていません\n22:00以降に確定されます',
    'Too many impressions from this viewer. Please wait before viewing again.': '閲覧回数が多すぎます\nしばらく待ってから再度お試しください',
    'Invalid credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Email already registered': 'このメールアドレスは既に登録されています',
    'Request failed': 'リクエストに失敗しました',
    'Missing bearer token': 'ログインが必要です',
    'Token has expired': 'セッションが期限切れです\n再度ログインしてください',
  };

  // 完全一致する翻訳があれば使用
  if (messageMap[detail]) {
    return messageMap[detail];
  }

  // 部分一致する翻訳を検索
  for (const [key, value] of Object.entries(messageMap)) {
    if (detail.includes(key)) {
      return value;
    }
  }

  // デフォルトメッセージ
  switch (type) {
    case ErrorType.NETWORK:
      return 'ネットワークに接続できません\n接続を確認してください';
    case ErrorType.AUTH:
      return '認証に失敗しました\n再度ログインしてください';
    case ErrorType.VALIDATION:
      return '入力内容に誤りがあります';
    case ErrorType.NOT_FOUND:
      return 'データが見つかりません';
    case ErrorType.CONFLICT:
      return 'データが競合しています';
    case ErrorType.FORBIDDEN:
      return 'この操作は許可されていません';
    case ErrorType.RATE_LIMIT:
      return '操作回数が多すぎます\nしばらく待ってから再度お試しください';
    case ErrorType.SERVER:
      return 'サーバーエラーが発生しました\nしばらくしてから再度お試しください';
    default:
      return detail || 'エラーが発生しました';
  }
}

/**
 * エラータイトルを取得
 */
export function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'ネットワークエラー';
    case ErrorType.AUTH:
      return '認証エラー';
    case ErrorType.VALIDATION:
      return '入力エラー';
    case ErrorType.NOT_FOUND:
      return '見つかりません';
    case ErrorType.CONFLICT:
      return '競合エラー';
    case ErrorType.FORBIDDEN:
      return '権限エラー';
    case ErrorType.RATE_LIMIT:
      return '制限エラー';
    case ErrorType.SERVER:
      return 'サーバーエラー';
    default:
      return 'エラー';
  }
}

/**
 * リトライ可能かどうかを判定
 */
export function canRetry(type: ErrorType): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.RATE_LIMIT,
    ErrorType.SERVER,
  ].includes(type);
}

/**
 * ApiErrorからErrorInfoを生成
 */
export function parseApiError(error: unknown): ErrorInfo {
  try {
    // エラーオブジェクトのバリデーション
    if (!error) {
      return {
        type: ErrorType.UNKNOWN,
        title: 'エラー',
        message: 'エラーが発生しました',
        canRetry: false,
      };
    }

    const apiError = error as ApiError;

    // statusの取得（デフォルト: -1）
    const status = typeof apiError.status === 'number' ? apiError.status : -1;

    // detailの取得（デフォルト: エラーメッセージまたは'Unknown error'）
    const detail = apiError.detail || (error instanceof Error ? error.message : null) || 'Unknown error occurred';

    const type = getErrorType(status);
    const message = translateErrorMessage(detail, type);
    const title = getErrorTitle(type);
    const retry = canRetry(type);

    return {
      type,
      title,
      message,
      canRetry: retry,
    };
  } catch (parseError) {
    logger.error('[parseApiError] Failed to parse error:', parseError);
    // パースに失敗した場合のフォールバック
    return {
      type: ErrorType.UNKNOWN,
      title: 'エラー',
      message: 'エラーが発生しました',
      canRetry: false,
    };
  }
}

/**
 * 汎用エラーハンドラー（ログ記録用）
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '[Error]';
  logger.error(`${prefix}`, error);

  // 本番環境では Sentry などにエラーを送信
  // if (__DEV__) {
  //   // Sentry.captureException(error, { tags: { context } });
  // }
}
