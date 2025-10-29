import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | よみびより",
  description: "よみびよりのプライバシーポリシー",
};

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-amber-900 hover:text-amber-700 transition-colors">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-8 font-serif">
          プライバシーポリシー
        </h1>

        <div className="prose prose-amber max-w-none bg-white rounded-lg p-8 shadow-sm border border-amber-100">
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              よみびより（以下「当サービス」）は、ユーザーの皆様の個人情報の保護を重要な責務と考え、本プライバシーポリシー（以下「本ポリシー」）を定めます。
            </p>
            <p className="text-sm text-gray-500">最終更新日：2024年10月30日</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">1. 収集する情報</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当サービスは、以下の情報を収集することがあります。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>メールアドレス（アカウント登録時）</li>
              <li>Apple ID（Apple Sign Inを利用する場合）</li>
              <li>ユーザー名およびプロフィール情報</li>
              <li>投稿された短歌（下の句）</li>
              <li>いいねや閲覧などの活動履歴</li>
              <li>デバイス情報、IPアドレス、利用環境に関する情報</li>
              <li>アプリ内の行動データ（PostHog経由で匿名化された分析データ）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">2. 情報の利用目的</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              収集した情報は、以下の目的で利用します。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>サービスの提供、維持、改善</li>
              <li>ユーザー認証およびアカウント管理</li>
              <li>ユーザー間のコミュニケーション機能の提供</li>
              <li>ランキングやレコメンデーション機能の提供</li>
              <li>不正行為の検出と防止</li>
              <li>統計分析とサービス改善のための匿名化されたデータ分析</li>
              <li>プッシュ通知の配信</li>
              <li>お問い合わせへの対応</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">3. 情報の共有と開示</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当サービスは、以下の場合を除き、収集した個人情報を第三者に提供することはありません。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要がある場合</li>
              <li>サービスの運営に必要な範囲で、業務委託先に提供する場合（Supabase、Upstash、PostHogなど）</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">4. データの保管と保護</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ユーザーの個人情報は、適切なセキュリティ対策を講じて保管します。データは暗号化され、アクセス制御により保護されています。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>データベース：Supabase（PostgreSQL）を利用し、Row Level Security (RLS) を有効化</li>
              <li>認証：Supabase Authによる安全な認証システム</li>
              <li>通信：HTTPS/TLS暗号化による安全な通信</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">5. ユーザーの権利</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ユーザーは、以下の権利を有します。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>個人情報の開示、訂正、削除を求める権利</li>
              <li>個人情報の利用停止を求める権利</li>
              <li>アカウントの削除を求める権利</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              これらの権利の行使を希望される場合は、サポートページからお問い合わせください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">6. Cookie等の技術</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当サービスは、サービスの改善や利用状況の分析のために、Cookie等の技術を使用することがあります。ユーザーはブラウザの設定でCookieを無効にできますが、一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">7. 第三者サービス</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              当サービスは、以下の第三者サービスを利用しています。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Supabase（認証・データベース）</li>
              <li>Upstash（Redis）</li>
              <li>PostHog（匿名化された分析データ）</li>
              <li>OpenAI / Anthropic Claude / XAI Grok（テーマ生成機能）</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              これらのサービスのプライバシーポリシーもあわせてご確認ください。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">8. 子供のプライバシー</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、13歳未満のお子様を対象としていません。13歳未満のお子様の個人情報を意図的に収集することはありません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">9. 本ポリシーの変更</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、本ページに掲載した時点から効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">10. お問い合わせ</h2>
            <p className="text-gray-700 leading-relaxed">
              本ポリシーに関するご質問やご要望は、
              <Link href="/support" className="text-amber-900 underline hover:text-amber-700">
                サポートページ
              </Link>
              からお問い合わせください。
            </p>
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
