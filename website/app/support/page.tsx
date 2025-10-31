import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サポート | よみびより",
  description: "よみびよりのサポートページ",
};

export default function Support() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-amber-900 hover:text-amber-700 transition-colors">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-8 font-serif">
          サポート
        </h1>

        <div className="prose prose-amber max-w-none bg-white rounded-lg p-8 shadow-sm border border-amber-100">
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed">
              よみびよりをご利用いただき、ありがとうございます。
              <br />
              サービスに関するご質問やお困りのことがございましたら、こちらのページをご確認ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">よくある質問</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. よみびよりとは何ですか？</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. よみびよりは、毎日届く上の句（5-7-5）に、あなたが下の句（7-7）を詠んで短歌を完成させる、言葉を紡ぐ喜びを味わえるサービスです。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. 投稿できる時間は決まっていますか？</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. はい。毎日6:00〜22:00（日本時間）の間に投稿できます。1日1首、カテゴリごとに投稿可能です。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. お題のカテゴリは何がありますか？</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. 「恋愛」「季節」「日常」「ユーモア」の4つのカテゴリからお題が毎日生成されます。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. ランキングはどのように決まりますか？</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. 他のユーザーからの「いいね」の数や閲覧数などを元に、リアルタイムでランキングが更新されます。毎日22:00に確定します。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. アカウントを削除したい</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. アプリ内の「設定」から「アカウント削除」を選択してください。削除後は投稿した作品も全て削除されます。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. パスワードを忘れてしまいました</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. ログイン画面の「パスワードをお忘れですか？」からパスワードリセットのメールをお送りします。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Q. 不適切な投稿を見つけました</h3>
                <p className="text-gray-700 leading-relaxed">
                  A. お手数ですが、下記のお問い合わせ先までご連絡ください。速やかに対応いたします。
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">お問い合わせ</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              上記で解決しない場合や、その他のご質問がございましたら、以下の方法でお問い合わせください。
            </p>

            <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">メールでのお問い合わせ</h3>
              <p className="text-gray-700 mb-2">
                メールアドレス：
                <a href="mailto:d.syoyu@gmail.com" className="text-amber-900 underline hover:text-amber-700">
                  d.syoyu@gmail.com
                </a>
              </p>
              <p className="text-sm text-gray-600">
                ※お問い合わせの際は、以下の情報をご記載いただくとスムーズです
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-gray-600">
                <li>お使いのデバイス（iPhone / Android）</li>
                <li>アプリのバージョン</li>
                <li>問題の詳細や発生状況</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              営業時間：平日 10:00〜18:00（土日祝日を除く）
              <br />
              ※お問い合わせの内容によっては、回答にお時間をいただく場合がございます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">動作環境</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">iOS</h3>
                <p className="text-gray-700">iOS 13.0以降</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Android</h3>
                <p className="text-gray-700">Android 5.0以降</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">関連リンク</h2>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-amber-900 underline hover:text-amber-700">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-amber-900 underline hover:text-amber-700">
                  利用規約
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-amber-900 hover:text-amber-700 transition-colors">
            ← ホームに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
