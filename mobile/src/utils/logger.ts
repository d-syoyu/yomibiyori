/**
 * Logger Utility
 * 開発環境でのみログを出力するユーティリティ
 * 本番環境では機密情報がログに出力されるのを防ぐ
 */

const isDev = __DEV__;

/**
 * Development-only logger
 * __DEV__ が true の場合のみログを出力
 */
export const logger = {
  /**
   * Debug level log (development only)
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.log(message, ...args);
    }
  },

  /**
   * Info level log (development only)
   */
  info: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.info(message, ...args);
    }
  },

  /**
   * Warning level log (development only)
   */
  warn: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.warn(message, ...args);
    }
  },

  /**
   * Error level log (always output, but sanitized in production)
   * エラーは常に出力するが、本番環境では詳細を省略
   */
  error: (message: string, error?: unknown): void => {
    if (isDev) {
      console.error(message, error);
    } else {
      // Production: log only the message, not the error details
      console.error(message);
    }
  },

  /**
   * Log sensitive data only in development
   * トークンやURLなどの機密情報用
   * 本番環境では絶対に出力しない
   */
  sensitive: (message: string, _data?: unknown): void => {
    if (isDev) {
      console.log(`[SENSITIVE] ${message}`, _data);
    }
    // Production: never log sensitive data
  },
};

export default logger;
