/**
 * Error Messages Constants
 * エラーメッセージ定数
 *
 * よみびよりの世界観に合わせた、優しく詩的なトーンのメッセージ
 */

/**
 * ネットワークエラーメッセージ
 */
export const NETWORK_ERROR = {
  title: '接続エラー',
  message: 'インターネット接続をご確認ください',
};

/**
 * コンテキスト別デフォルトメッセージ
 */
export const CONTEXT_MESSAGES = {
  work_creation: {
    default: '作品を投稿できませんでした',
    hint: 'しばらくしてからもう一度お試しください',
  },
  work_fetching: {
    default: '作品を読み込めませんでした',
    hint: 'もう一度お試しください',
  },
  ranking_fetching: {
    default: 'ランキングを表示できませんでした',
    hint: 'もう一度お試しください',
  },
  theme_fetching: {
    default: 'お題を読み込めませんでした',
    hint: 'もう一度お試しください',
  },
  like_action: {
    default: 'いいねできませんでした',
    hint: 'もう一度お試しください',
  },
  authentication: {
    default: 'ログインできませんでした',
    hint: 'もう一度お試しください',
  },
  update_work: {
    default: '作品を更新できませんでした',
    hint: 'もう一度お試しください',
  },
  delete_work: {
    default: '作品を削除できませんでした',
    hint: 'もう一度お試しください',
  },
  user_data: {
    default: '情報を読み込めませんでした',
    hint: 'もう一度お試しください',
  },
  user_profile: {
    default: 'プロフィールを読み込めませんでした',
    hint: 'もう一度お試しください',
  },
  user_works: {
    default: '作品を読み込めませんでした',
    hint: 'もう一度お試しください',
  },
  generic: {
    default: 'エラーが発生しました',
    hint: 'もう一度お試しください',
  },
} as const;

/**
 * 特定のエラー条件に対する詩的なメッセージ
 */
export const CUSTOM_MESSAGES = {
  // ランキング関連
  ranking: {
    notYetCreated: 'ランキングは22:00に発表されます\n楽しみにお待ちください',
    notFound: 'このカテゴリのランキングはまだありません',
  },

  // お題関連
  theme: {
    notFound: '今日のお題はまだ届いていません',
    categoryEmpty: 'このカテゴリのお題はまだありません',
  },

  // 作品関連
  work: {
    dailyLimitReached: '今日の投稿数に達しました\nまた明日お詠みください',
    alreadyLiked: 'すでにいいねしています',
    notFound: 'この作品は削除されたか、見つかりません',
  },

  // 認証関連
  auth: {
    invalidCredentials: 'メールアドレスまたはパスワードが正しくありません',
    emailAlreadyExists: 'このメールアドレスは既に登録されています',
    weakPassword: 'パスワードは8文字以上で設定してください',
    invalidEmail: 'メールアドレスの形式が正しくありません',
  },
} as const;

/**
 * バリデーションメッセージ
 */
export const VALIDATION_MESSAGES = {
  // 投稿画面
  composition: {
    emptyLines: '下の句を入力してください',
    noTheme: 'お題を選択してください',
  },

  // ログイン画面
  login: {
    emptyCredentials: 'メールアドレスとパスワードを入力してください',
    emptyDisplayName: '表示名を入力してください',
  },
} as const;

/**
 * 成功メッセージ
 */
export const SUCCESS_MESSAGES = {
  workCreated: '作品を投稿しました',
  liked: 'いいねしました',
  loggedIn: 'ログインしました',
  signedUp: 'アカウントを作成しました',
} as const;

/**
 * HTTPステータスコード別メッセージ
 */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: '入力内容をご確認ください',
  401: 'ログインが必要です',
  403: 'この操作は許可されていません',
  404: '見つかりませんでした',
  409: '既に登録されています',
  429: 'しばらく時間をおいてからお試しください',
  500: 'サーバーで問題が発生しました',
  503: 'ただいまメンテナンス中です',
};

/**
 * エラーメッセージにヒントを追加
 */
export function withHint(message: string, hint?: string): string {
  if (!hint) return message;
  return `${message}\n${hint}`;
}

/**
 * エラーメッセージを整形
 */
export function formatErrorMessage(message: string): string {
  // 末尾の句点を統一
  let formatted = message.trim();

  // 技術的な用語を置き換え
  formatted = formatted
    .replace(/取得に失敗/g, '読み込めません')
    .replace(/失敗しました/g, 'できませんでした')
    .replace(/エラーが発生しました/g, '問題が発生しました')
    .replace(/不正な/g, '正しくない')
    .replace(/無効な/g, '正しくない');

  return formatted;
}
