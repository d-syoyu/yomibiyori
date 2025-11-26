import Link from "next/link";
import type { Metadata } from "next";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export const metadata: Metadata = {
  title: "プライバシーポリシー | よみびより",
  description: "よみびよりのプライバシーポリシー",
};

const sections = [
  {
    id: "collection",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: "収集する情報",
    items: [
      "メールアドレス（アカウント登録時）",
      "Apple ID（Apple Sign Inを利用する場合）",
      "ユーザー名およびプロフィール情報",
      "投稿された短歌（下の句）",
      "いいねや閲覧などの活動履歴",
      "デバイス情報、IPアドレス、利用環境に関する情報",
      "アプリ内の行動データ（PostHog経由で匿名化された分析データ）",
    ],
  },
  {
    id: "purpose",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: "情報の利用目的",
    items: [
      "サービスの提供、維持、改善",
      "ユーザー認証およびアカウント管理",
      "ユーザー間のコミュニケーション機能の提供",
      "ランキングやレコメンデーション機能の提供",
      "不正行為の検出と防止",
      "統計分析とサービス改善のための匿名化されたデータ分析",
      "プッシュ通知の配信",
      "お問い合わせへの対応",
    ],
  },
  {
    id: "sharing",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
    title: "情報の共有と開示",
    description: "当サービスは、以下の場合を除き、収集した個人情報を第三者に提供することはありません。",
    items: [
      "ユーザーの同意がある場合",
      "法令に基づく場合",
      "人の生命、身体または財産の保護のために必要がある場合",
      "サービスの運営に必要な範囲で、業務委託先に提供する場合",
    ],
  },
  {
    id: "security",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "データの保管と保護",
    description: "ユーザーの個人情報は、適切なセキュリティ対策を講じて保管します。",
    items: [
      "データベース：Supabase（PostgreSQL）を利用し、Row Level Security (RLS) を有効化",
      "認証：Supabase Authによる安全な認証システム",
      "通信：HTTPS/TLS暗号化による安全な通信",
    ],
  },
  {
    id: "rights",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "ユーザーの権利",
    description: "ユーザーは、以下の権利を有します。",
    items: [
      "個人情報の開示、訂正、削除を求める権利",
      "個人情報の利用停止を求める権利",
      "アカウントの削除を求める権利",
    ],
  },
];

const thirdPartyServices = [
  { name: "Supabase", purpose: "認証・データベース" },
  { name: "Upstash", purpose: "Redis" },
  { name: "PostHog", purpose: "匿名化された分析データ" },
  { name: "OpenAI / Anthropic Claude / XAI Grok", purpose: "テーマ生成機能" },
];

export default function Privacy() {
  return (
    <div className="page-wrapper overflow-hidden relative">
      <BackgroundDecoration />
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 lg:pt-28">
          <div className="page-container text-center space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              ホームに戻る
            </Link>
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#F5F3ED] text-[#6B7B4F] text-sm font-medium tracking-wider border border-[#EBE8DD]">
              Privacy Policy
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] leading-tight">
              プライバシー<br className="sm:hidden" />ポリシー
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              よみびよりは、ユーザーの皆様の個人情報の保護を<br className="hidden sm:block" />
              重要な責務と考え、本ポリシーを定めます。
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">最終更新日：2024年10月30日</p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 bg-white/50 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent"></div>
          <div className="page-container max-w-4xl space-y-12">
            {sections.map((section, index) => (
              <div key={section.id} className="card hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F3ED] text-[#6B7B4F] flex items-center justify-center flex-shrink-0">
                    {section.icon}
                  </div>
                  <div className="flex-1 space-y-4">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                      {index + 1}. {section.title}
                    </h2>
                    {section.description && (
                      <p className="text-[var(--color-text-secondary)]">{section.description}</p>
                    )}
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-[var(--color-text-secondary)]">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-[var(--color-igusa)] flex-shrink-0 mt-0.5">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}

            {/* Cookie */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFE4E8] text-[#FFB7C5] flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                </div>
                <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">6. Cookie等の技術</h2>
                  <p className="text-[var(--color-text-secondary)]">
                    当サービスは、サービスの改善や利用状況の分析のために、Cookie等の技術を使用することがあります。
                    ユーザーはブラウザの設定でCookieを無効にできますが、一部機能が利用できなくなる場合があります。
                  </p>
                </div>
              </div>
            </div>

            {/* Third Party Services */}
            <div className="card hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E0F2F1] text-[#009688] flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div className="flex-1 space-y-4">
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">7. 第三者サービス</h2>
                  <p className="text-[var(--color-text-secondary)]">当サービスは、以下の第三者サービスを利用しています。</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {thirdPartyServices.map((service) => (
                      <div key={service.name} className="bg-[var(--color-washi)] rounded-lg p-4 border border-[var(--color-border)]">
                        <p className="font-medium text-[var(--color-text-primary)]">{service.name}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">{service.purpose}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Children & Changes */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">8. 子供のプライバシー</h2>
                <p className="text-[var(--color-text-secondary)]">
                  当サービスは、13歳未満のお子様を対象としていません。13歳未満のお子様の個人情報を意図的に収集することはありません。
                </p>
              </div>
              <div className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">9. 本ポリシーの変更</h2>
                <p className="text-[var(--color-text-secondary)]">
                  当サービスは、必要に応じて本ポリシーを変更することがあります。変更後のポリシーは、本ページに掲載した時点から効力を生じます。
                </p>
              </div>
            </div>

            {/* Contact */}
            <div className="card bg-gradient-to-br from-[var(--color-igusa)]/5 to-[var(--color-sakura)]/5 border-[var(--color-igusa)]/20">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">10. お問い合わせ</h2>
                <p className="text-[var(--color-text-secondary)]">
                  本ポリシーに関するご質問やご要望は、サポートページからお問い合わせください。
                </p>
                <Link href="/support" className="btn-primary inline-flex items-center gap-2">
                  サポートページへ
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <section className="py-12 border-t border-[var(--color-border)] bg-white/30">
          <div className="page-container">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                ホームに戻る
              </Link>
              <div className="flex gap-6 text-sm">
                <Link href="/terms" className="text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors">利用規約</Link>
                <Link href="/support" className="text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors">サポート</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
