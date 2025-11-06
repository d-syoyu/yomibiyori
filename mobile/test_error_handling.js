/**
 * エラーハンドリングのテストスクリプト
 * Node.js環境で実行可能
 */

// モックエラーオブジェクト
const mockErrors = {
  networkError: {
    status: 0,
    message: 'Network error - please check your connection',
  },
  authError: {
    status: 401,
    detail: 'Invalid credentials',
  },
  validationError: {
    status: 422,
    detail: 'Validation failed',
  },
  notFoundError: {
    status: 404,
    detail: 'Theme not found',
  },
  conflictError: {
    status: 409,
    detail: 'You have already submitted a work today for this category',
  },
  serverError: {
    status: 500,
    detail: 'Internal server error',
  },
  unknownError: {
    status: -1,
    detail: 'Unknown error occurred',
  },
  nullError: null,
  undefinedError: undefined,
  malformedError: {
    foo: 'bar',
    // statusやdetailが存在しない
  },
};

// エラーハンドラーのテスト（parseApiErrorのロジックをシミュレート）
function parseApiError(error) {
  try {
    // エラーオブジェクトのバリデーション
    if (!error) {
      return {
        type: 'UNKNOWN',
        title: 'エラー',
        message: 'エラーが発生しました',
        canRetry: false,
      };
    }

    // statusの取得（デフォルト: -1）
    const status = typeof error.status === 'number' ? error.status : -1;

    // detailの取得（デフォルト: エラーメッセージまたは'Unknown error'）
    const detail = error.detail || error.message || 'Unknown error occurred';

    // エラータイプの判定
    let type = 'UNKNOWN';
    if (status === 0 || status === -1) type = 'NETWORK';
    else if (status === 401) type = 'AUTH';
    else if (status === 404) type = 'NOT_FOUND';
    else if (status === 409) type = 'CONFLICT';
    else if (status === 422) type = 'VALIDATION';
    else if (status >= 500) type = 'SERVER';

    // タイトルとメッセージの生成
    const titleMap = {
      NETWORK: 'ネットワークエラー',
      AUTH: '認証エラー',
      VALIDATION: '入力エラー',
      NOT_FOUND: '見つかりません',
      CONFLICT: '競合エラー',
      SERVER: 'サーバーエラー',
      UNKNOWN: 'エラー',
    };

    const title = titleMap[type];

    // メッセージの翻訳
    const messageMap = {
      'Network error - please check your connection': 'ネットワークに接続できません\n接続を確認してください',
      'Invalid credentials': 'メールアドレスまたはパスワードが正しくありません',
      'Theme not found': 'お題が見つかりません',
      'You have already submitted a work today for this category': '今日はすでにこのカテゴリに投稿済みです',
      'Internal server error': 'サーバーエラーが発生しました\nしばらくしてから再度お試しください',
    };

    let message = messageMap[detail] || detail;

    // リトライ可能かどうか
    const canRetry = ['NETWORK', 'SERVER'].includes(type);

    return {
      type,
      title,
      message,
      canRetry,
    };
  } catch (parseError) {
    console.error('[parseApiError] Failed to parse error:', parseError);
    // パースに失敗した場合のフォールバック
    return {
      type: 'UNKNOWN',
      title: 'エラー',
      message: 'エラーが発生しました',
      canRetry: false,
    };
  }
}

// テスト実行
console.log('=' .repeat(60));
console.log('エラーハンドリングのテスト');
console.log('=' .repeat(60));

Object.entries(mockErrors).forEach(([errorName, errorObj]) => {
  console.log(`\n[テスト] ${errorName}`);
  console.log('入力:', JSON.stringify(errorObj, null, 2));

  try {
    const result = parseApiError(errorObj);
    console.log('✅ パース成功:');
    console.log('  - タイプ:', result.type);
    console.log('  - タイトル:', result.title);
    console.log('  - メッセージ:', result.message);
    console.log('  - リトライ可能:', result.canRetry);
  } catch (error) {
    console.log('❌ パース失敗:', error.message);
  }
});

console.log('\n' + '='.repeat(60));
console.log('テスト完了');
console.log('='.repeat(60));

// 追加テスト: エラーハンドラー自体がエラーを起こす場合
console.log('\n[追加テスト] エラーハンドラー内でのエラー処理');

function testErrorHandlerWithException() {
  // 循環参照を持つオブジェクト（JSON.stringifyでエラーになる）
  const circularRef = {};
  circularRef.self = circularRef;

  try {
    console.log('循環参照オブジェクトのパース:');
    const result = parseApiError({ status: 400, detail: circularRef });
    console.log('✅ パース成功（文字列化された）:', result.message);
  } catch (error) {
    console.log('❌ エラー発生:', error.message);
  }
}

testErrorHandlerWithException();

console.log('\n💡 次のステップ:');
console.log('  1. 実際のアプリで投稿ボタンをテスト');
console.log('  2. ネットワークを切断して投稿ボタンをテスト');
console.log('  3. 無効なトークンで投稿ボタンをテスト');
