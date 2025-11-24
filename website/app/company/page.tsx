import Link from "next/link";
import type { Metadata } from "next";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export const metadata: Metadata = {
  title: "会社概要 | よみびより",
  description: "株式会社SOGAの会社概要ページ。よみびよりアプリサービスを開発・運営しています。",
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
