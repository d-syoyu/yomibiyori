import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "サポート・よくある質問 | よみびより",
  description: "よみびよりのサポートページ。よくある質問（FAQ）、お問い合わせ方法、動作環境について。投稿時間や使い方、アカウント関連のご質問にお答えします。",
  openGraph: {
    title: "サポート・よくある質問 | よみびより",
    description: "よみびよりの使い方やよくある質問、お問い合わせ方法をご案内します。",
  },
};

// FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "よみびよりとは何ですか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "よみびよりは、毎日届く上の句(5-7-5)に、あなたが下の句(7-7)を詠んで短歌を完成させる、言葉を紡ぐ喜びを味わえるサービスです。",
      },
    },
    {
      "@type": "Question",
      name: "投稿できる時間は決まっていますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。毎日6:00〜22:00(日本時間)の間に投稿できます。1日1首、カテゴリごとに投稿可能です。",
      },
    },
    {
      "@type": "Question",
      name: "お題のカテゴリは何がありますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "「恋愛」「季節」「日常」「ユーモア」の4つのカテゴリからお題が毎日生成されます。",
      },
    },
    {
      "@type": "Question",
      name: "ランキングはどのように決まりますか？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "他のユーザーからの「いいね」の数や閲覧数などを元に、リアルタイムでランキングが更新されます。毎日22:00に確定します。",
      },
    },
    {
      "@type": "Question",
      name: "アカウントを削除したい",
      acceptedAnswer: {
        "@type": "Answer",
        text: "アプリ内の「設定」から「アカウント削除」を選択してください。削除後は投稿した作品も全て削除されます。",
      },
    },
  ],
};

function BackgroundDecoration() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="absolute top-20 -left-20 w-96 h-96 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, var(--color-igusa), transparent)" }}
      />
      <div
        className="absolute bottom-40 -right-32 w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, var(--color-igusa), transparent)" }}
      />
    </div>
  );
}

const faqs = [
  {
    question: "よみびよりとは何ですか？",
    answer: "よみびよりは、毎日届く上の句(5-7-5)に、あなたが下の句(7-7)を詠んで短歌を完成させる、言葉を紡ぐ喜びを味わえるサービスです。",
  },
  {
    question: "投稿できる時間は決まっていますか？",
    answer: "はい。毎日6:00〜22:00(日本時間)の間に投稿できます。1日1首、カテゴリごとに投稿可能です。",
  },
  {
    question: "お題のカテゴリは何がありますか？",
    answer: "「恋愛」「季節」「日常」「ユーモア」の4つのカテゴリからお題が毎日生成されます。",
  },
  {
    question: "ランキングはどのように決まりますか？",
    answer: "他のユーザーからの「いいね」の数や閲覧数などを元に、リアルタイムでランキングが更新されます。毎日22:00に確定します。",
  },
  {
    question: "アカウントを削除したい",
    answer: "アプリ内の「設定」から「アカウント削除」を選択してください。削除後は投稿した作品も全て削除されます。",
  },
  {
    question: "パスワードを忘れてしまいました",
    answer: "ログイン画面の「パスワードをお忘れですか？」からパスワードリセットのメールをお送りします。",
  },
  {
    question: "不適切な投稿を見つけました",
    answer: "お手数ですが、下記のお問い合わせ先までご連絡ください。速やかに対応いたします。",
  },
];

const systemRequirements = [
  {
    platform: "iOS",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    version: "iOS 13.0以降",
  },
  {
    platform: "Android",
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.31-.16-.69-.04-.85.26l-1.86 3.22c-1.34-.63-2.85-.97-4.47-.97s-3.13.34-4.47.97L5.67 5.71c-.16-.31-.54-.43-.85-.26-.31.16-.43.54-.26.85l1.84 3.18C3.38 11.12 1.5 14.18 1.5 17.62h21c0-3.44-1.88-6.5-4.9-8.14zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
      </svg>
    ),
    version: "Android 5.0以降",
  },
];

export default function Support() {
  return (
    <>
      {/* FAQ Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen" style={{ background: "linear-gradient(to bottom, var(--color-bg-primary), var(--color-bg-secondary))" }}>
        <BackgroundDecoration />

      {/* ヘッダー */}
      <header className="pt-8 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ホームに戻る
          </Link>
        </div>
      </header>

      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto">

          {/* ヒーローセクション */}
          <section className="text-center mb-16">
            <div
              className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{
                background: "rgba(var(--color-igusa-rgb), 0.1)",
                color: "var(--color-igusa)"
              }}
            >
              サポート
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              お困りのことはありませんか？
            </h1>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: "var(--color-text-secondary)" }}
            >
              よみびよりをご利用いただき、ありがとうございます。<br />
              サービスに関するご質問やお困りのことがございましたら、こちらのページをご確認ください。
            </p>
          </section>

          {/* よくある質問 */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(var(--color-igusa-rgb), 0.1)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--color-igusa)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                よくある質問
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl p-6 transition-all duration-200 hover:shadow-md"
                  style={{
                    background: "var(--color-bg-primary)",
                    border: "1px solid rgba(var(--color-igusa-rgb), 0.1)"
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: "rgba(var(--color-igusa-rgb), 0.1)",
                        color: "var(--color-igusa)"
                      }}
                    >
                      Q
                    </span>
                    <div className="flex-1">
                      <h3
                        className="font-semibold mb-2"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {faq.question}
                      </h3>
                      <p
                        className="leading-relaxed"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* お問い合わせ */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(var(--color-igusa-rgb), 0.1)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--color-igusa)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                お問い合わせ
              </h2>
            </div>

            <p
              className="mb-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              上記で解決しない場合や、その他のご質問がございましたら、以下の方法でお問い合わせください。
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* メールでのお問い合わせ */}
              <div
                className="rounded-xl p-6 transition-all duration-200 hover:shadow-md"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "1px solid rgba(var(--color-igusa-rgb), 0.1)"
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "rgba(var(--color-igusa-rgb), 0.1)" }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: "var(--color-igusa)" }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  メールでのお問い合わせ
                </h3>
                <a
                  href="mailto:d.syoyu@gmail.com"
                  className="text-lg font-medium hover:underline block mb-4"
                  style={{ color: "var(--color-igusa)" }}
                >
                  d.syoyu@gmail.com
                </a>
                <p
                  className="text-sm mb-3"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  お問い合わせの際は以下をご記載ください：
                </p>
                <ul
                  className="text-sm space-y-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <li className="flex items-center gap-2">
                    <span style={{ color: "var(--color-igusa)" }}>•</span>
                    お使いのデバイス (iPhone / Android)
                  </li>
                  <li className="flex items-center gap-2">
                    <span style={{ color: "var(--color-igusa)" }}>•</span>
                    アプリのバージョン
                  </li>
                  <li className="flex items-center gap-2">
                    <span style={{ color: "var(--color-igusa)" }}>•</span>
                    問題の詳細や発生状況
                  </li>
                </ul>
              </div>

              {/* Xでのお問い合わせ */}
              <div
                className="rounded-xl p-6 transition-all duration-200 hover:shadow-md"
                style={{
                  background: "var(--color-bg-primary)",
                  border: "1px solid rgba(var(--color-igusa-rgb), 0.1)"
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "rgba(0, 0, 0, 0.05)" }}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  X (旧Twitter) でのお問い合わせ
                </h3>
                <p
                  className="text-sm mb-4"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  XのDMでもお問い合わせを受け付けております。
                </p>
                <a
                  href="https://x.com/messages/compose?recipient_id=1984540429845692416"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors bg-black text-white hover:bg-gray-800"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  XのDMで問い合わせる
                </a>
              </div>
            </div>

            <p
              className="text-sm mt-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              営業時間：平日 10:00〜18:00（土日祝日を除く）<br />
              ※お問い合わせの内容によっては、回答にお時間をいただく場合がございます。
            </p>
          </section>

          {/* 動作環境 */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(var(--color-igusa-rgb), 0.1)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--color-igusa)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2
                className="text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                動作環境
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {systemRequirements.map((req, index) => (
                <div
                  key={index}
                  className="rounded-xl p-6 flex items-center gap-4 transition-all duration-200 hover:shadow-md"
                  style={{
                    background: "var(--color-bg-primary)",
                    border: "1px solid rgba(var(--color-igusa-rgb), 0.1)"
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(var(--color-igusa-rgb), 0.1)",
                      color: "var(--color-igusa)"
                    }}
                  >
                    {req.icon}
                  </div>
                  <div>
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {req.platform}
                    </h3>
                    <p style={{ color: "var(--color-text-secondary)" }}>
                      {req.version}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 関連リンク */}
          <section
            className="rounded-xl p-8 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(var(--color-igusa-rgb), 0.05), rgba(var(--color-igusa-rgb), 0.1))",
              border: "1px solid rgba(var(--color-igusa-rgb), 0.1)"
            }}
          >
            <h2
              className="text-xl font-bold mb-6"
              style={{ color: "var(--color-text-primary)" }}
            >
              関連リンク
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
                style={{
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(var(--color-igusa-rgb), 0.2)"
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                プライバシーポリシー
              </Link>
              <Link
                href="/terms"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
                style={{
                  background: "var(--color-bg-primary)",
                  color: "var(--color-text-primary)",
                  border: "1px solid rgba(var(--color-igusa-rgb), 0.2)"
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                利用規約
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* フッター */}
      <footer
        className="py-8 px-6 mt-8"
        style={{ borderTop: "1px solid rgba(var(--color-igusa-rgb), 0.1)" }}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ホームに戻る
          </Link>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            © {new Date().getFullYear()} よみびより
          </p>
        </div>
      </footer>
      </div>
    </>
  );
}
