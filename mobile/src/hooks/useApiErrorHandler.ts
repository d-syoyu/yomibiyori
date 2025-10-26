/**
 * API Error Handler Hook
 * APIエラーハンドリングを統一するカスタムフック
 */

import { useCallback } from 'react';
import { useToastStore } from '../stores/useToastStore';
import { parseApiError } from '../utils/errorHandler';
import {
  NETWORK_ERROR,
  CONTEXT_MESSAGES,
  CUSTOM_MESSAGES,
  HTTP_STATUS_MESSAGES,
  withHint,
  formatErrorMessage,
} from '../constants/errorMessages';

/**
 * エラーコンテキスト定義
 * エラー発生時の文脈情報を提供
 */
export type ErrorContext =
  | 'work_creation'        // 作品投稿
  | 'work_fetching'        // 作品取得
  | 'ranking_fetching'     // ランキング取得
  | 'theme_fetching'       // お題取得
  | 'like_action'          // いいねアクション
  | 'authentication'       // 認証処理
  | 'user_data'            // ユーザーデータ取得
  | 'generic';             // 汎用

/**
 * 特定のエラー条件に対するカスタムメッセージ
 */
interface CustomErrorCondition {
  check: (error: any) => boolean;
  message: string;
  title?: string;
}

/**
 * エラーコンテキストごとのカスタム条件
 */
const contextCustomConditions: Partial<Record<ErrorContext, CustomErrorCondition[]>> = {
  ranking_fetching: [
    {
      check: (error) => error?.status === 404 || error?.detail?.includes('not found'),
      message: CUSTOM_MESSAGES.ranking.notYetCreated,
    },
    {
      check: (error) => error?.detail === 'Ranking not available',
      message: CUSTOM_MESSAGES.ranking.notYetCreated,
    },
  ],
  theme_fetching: [
    {
      check: (error) => error?.status === 404,
      message: CUSTOM_MESSAGES.theme.notFound,
    },
    {
      check: (error) => error?.message?.includes('No themes found'),
      message: CUSTOM_MESSAGES.theme.categoryEmpty,
    },
  ],
  work_creation: [
    {
      check: (error) => error?.detail?.includes('1日1作品') || error?.detail?.includes('daily limit'),
      message: CUSTOM_MESSAGES.work.dailyLimitReached,
    },
  ],
  like_action: [
    {
      check: (error) => error?.detail?.includes('already liked') || error?.detail?.includes('既に'),
      message: CUSTOM_MESSAGES.work.alreadyLiked,
    },
  ],
  authentication: [
    {
      check: (error) => error?.status === 401 || error?.detail?.includes('Invalid credentials'),
      message: CUSTOM_MESSAGES.auth.invalidCredentials,
    },
    {
      check: (error) => error?.status === 409 || error?.detail?.includes('already exists'),
      message: CUSTOM_MESSAGES.auth.emailAlreadyExists,
    },
    {
      check: (error) => error?.detail?.includes('password') && error?.detail?.includes('weak'),
      message: CUSTOM_MESSAGES.auth.weakPassword,
    },
  ],
};

/**
 * ネットワークエラーの判定
 */
function isNetworkError(error: any): boolean {
  return (
    error?.status === 0 ||
    error?.message?.includes('Network') ||
    error?.message?.includes('Failed to fetch') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ETIMEDOUT'
  );
}

/**
 * API エラーハンドリングフック
 */
export function useApiErrorHandler() {
  const showError = useToastStore((state) => state.showError);

  /**
   * エラーを処理し、適切なトーストメッセージを表示
   *
   * @param error - キャッチされたエラーオブジェクト
   * @param context - エラーのコンテキスト
   * @param customMessage - カスタムメッセージ（オプション）
   */
  const handleError = useCallback(
    (error: any, context: ErrorContext = 'generic', customMessage?: string) => {
      console.error(`[${context}] Error:`, error);

      // ネットワークエラーの場合は優先的に表示
      if (isNetworkError(error)) {
        showError(NETWORK_ERROR.message, NETWORK_ERROR.title);
        return;
      }

      // コンテキスト固有のカスタム条件をチェック
      const customConditions = contextCustomConditions[context];
      if (customConditions) {
        for (const condition of customConditions) {
          if (condition.check(error)) {
            showError(condition.message, condition.title);
            return;
          }
        }
      }

      // カスタムメッセージが指定されている場合
      if (customMessage) {
        showError(formatErrorMessage(customMessage));
        return;
      }

      // HTTPステータスコードから適切なメッセージを取得
      if (error?.status && HTTP_STATUS_MESSAGES[error.status]) {
        const statusMessage = HTTP_STATUS_MESSAGES[error.status];
        showError(statusMessage);
        return;
      }

      // API エラーレスポンスをパース
      const errorInfo = parseApiError(error);

      // コンテキストメッセージを取得
      const contextMsg = CONTEXT_MESSAGES[context] || CONTEXT_MESSAGES.generic;

      // パースされたメッセージが汎用的すぎる場合、コンテキストメッセージを使用
      let finalMessage: string;
      if (
        errorInfo.message === 'エラーが発生しました' ||
        errorInfo.message.includes('失敗しました')
      ) {
        finalMessage = withHint(contextMsg.default, contextMsg.hint);
      } else {
        // サーバーからの具体的なメッセージを整形して使用
        finalMessage = formatErrorMessage(errorInfo.message);
      }

      showError(finalMessage, errorInfo.title);
    },
    [showError]
  );

  /**
   * エラーをラップして try-catch で使用しやすくする
   *
   * @param fn - 実行する非同期関数
   * @param context - エラーコンテキスト
   * @param customMessage - カスタムメッセージ（オプション）
   * @returns Promise<T | null> - 成功時は結果、失敗時は null
   */
  const withErrorHandling = useCallback(
    async <T>(
      fn: () => Promise<T>,
      context: ErrorContext = 'generic',
      customMessage?: string
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        handleError(error, context, customMessage);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    withErrorHandling,
  };
}

/**
 * 使用例:
 *
 * 1. 基本的な使い方:
 * const { handleError } = useApiErrorHandler();
 *
 * try {
 *   await api.createWork(data);
 * } catch (error) {
 *   handleError(error, 'work_creation');
 * }
 *
 * 2. ラッパー関数を使う:
 * const { withErrorHandling } = useApiErrorHandler();
 *
 * const result = await withErrorHandling(
 *   () => api.createWork(data),
 *   'work_creation'
 * );
 *
 * if (result) {
 *   // 成功時の処理
 * }
 */
