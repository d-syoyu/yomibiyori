import Link from "next/link";
import type { Metadata } from "next";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export const metadata: Metadata = {
  title: "会社概要 | よみびより - 株式会社SOGA",
  description: "株式会社SOGAの会社概要。短歌アプリ「よみびより」の企画・開発・運営を行っています。大阪府守口市に本社を置き、詩的SNSを通じて日本の言葉文化を発信しています。",
  openGraph: {
    title: "会社概要 | よみびより - 株式会社SOGA",
    description: "短歌アプリ「よみびより」を開発・運営する株式会社SOGAの会社概要です。",
  },
};

// Organization Schema for SEO
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "株式会社SOGA",
  url: "https://yomibiyori.app",
  logo: "https://yomibiyori.app/icon-512.png",
  description: "短歌アプリ「よみびより」の企画・開発・運営",
  foundingDate: "2024-10",
  address: {
    "@type": "PostalAddress",
    addressLocality: "守口市",
    addressRegion: "大阪府",
    addressCountry: "JP",
  },
};

const companyFacts: { label: string; value: string }[] = [
  { label: "会社名", value: "株式会社SOGA" },
  { label: "代表者", value: "吉川颯我" },
  { label: "設立", value: "2024年10月" },
  { label: "所在地", value: "大阪府守口市外島町1-5" },
  { label: "資本金", value: "10万円" },
  { label: "従業員数", value: "1人" },
];

export default function CompanyPage() {
  return (
    <>
      {/* Organization Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <div className="page-wrapper overflow-hidden relative">
        <BackgroundDecoration />
      <main className="relative z-10 py-16 lg:py-24">
        <div className="page-container space-y-12">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-[var(--color-ai)] transition-colors text-sm">
            ← ホームに戻る
          </Link>
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-[var(--color-border)] text-sm tracking-wide shadow-sm">
              Company
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-igusa)]" />
            </span>
            <h1 className="section-heading">会社概要</h1>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
              「よみびより」は、人と人が短歌で響き合い、日々を少しやわらかくする詩的SNSです。
              株式会社SOGAは、このアプリサービスの企画・開発・運営を一貫して手がけています。
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="card lg:col-span-2 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[var(--color-igusa)]">基本情報</h2>
                <p className="text-[var(--color-text-secondary)]">現在公開できる範囲での会社情報です。</p>
              </div>
              <dl className="grid sm:grid-cols-2 gap-4">
                {companyFacts.map((item) => (
                  <div key={item.label} className="p-4 rounded-lg bg-white/80 border border-[var(--color-border)] shadow-sm">
                    <dt className="text-sm text-[var(--color-text-secondary)] mb-1 tracking-wide">{item.label}</dt>
                    <dd className="text-lg font-semibold text-[var(--color-text-primary)]">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="space-y-6">
              <div className="card space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-[var(--color-igusa)]">事業内容</h2>
                  <p className="text-[var(--color-text-secondary)]">コアプロダクトに集中しています。</p>
                </div>
                <div className="p-4 rounded-lg bg-[var(--color-washi)] border border-[var(--color-border)] space-y-2">
                  <p className="text-base text-[var(--color-text-primary)] font-semibold">よみびよりのアプリサービス</p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    ひらめきが届く上の句と、ユーザーが紡ぐ下の句で一首を完成させる詩的SNS。
                    企画・開発・運営までを自社で行っています。
                  </p>
                </div>
              </div>

              <div className="card space-y-3">
                <h2 className="text-2xl font-bold text-[var(--color-igusa)]">お問い合わせ</h2>
                <p className="text-[var(--color-text-secondary)]">掲載内容の更新や取材のご連絡はこちらから。</p>
                <a
                  href="mailto:d.syou@gmail.com"
                  className="inline-flex items-center gap-2 text-[var(--color-ai)] font-semibold underline underline-offset-4 decoration-[var(--color-ai-light)]"
                >
                  d.syou@gmail.com
                </a>
                <p className="text-xs text-[var(--color-text-secondary)]">更新頻度：静的掲載（必要に応じて手動で反映します）</p>
              </div>

              <div className="card space-y-3">
                <h2 className="text-2xl font-bold text-[var(--color-igusa)]">法的情報</h2>
                <p className="text-[var(--color-text-secondary)]">有料サービスに関する表記はこちら。</p>
                <Link
                  href="/company/tokushoho"
                  className="inline-flex items-center gap-2 text-[var(--color-ai)] font-semibold hover:underline underline-offset-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  特定商取引法に基づく表記
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  );
}
