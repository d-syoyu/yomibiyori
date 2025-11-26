import Link from "next/link";
import type { Metadata } from "next";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | よみびより",
  description: "よみびよりの特定商取引法に基づく表記ページ。販売事業者情報、支払い方法、返品・キャンセルについて。",
};

const tokushohoItems: { label: string; value: string | React.ReactNode }[] = [
  { label: "販売事業者", value: "株式会社SOGA" },
  { label: "代表者", value: "吉川颯我" },
  { label: "所在地", value: "大阪府守口市外島町1-5" },
  {
    label: "お問い合わせ",
    value: (
      <a href="mailto:d.syou@gmail.com" className="text-[var(--color-ai)] underline underline-offset-4">
        d.syou@gmail.com
      </a>
    ),
  },
  { label: "販売価格", value: "各サービスページに表示された価格（税込）" },
  {
    label: "支払方法",
    value: "クレジットカード決済、銀行振込（Stripe決済システムを利用）",
  },
  { label: "支払時期", value: "クレジットカード：購入時に即時決済\n銀行振込：振込先口座へのお振込み完了時" },
  {
    label: "商品の引渡時期",
    value: "クレジットカード：決済完了後、即時\n銀行振込：入金確認後、通常1〜2営業日以内",
  },
  {
    label: "返品・キャンセル",
    value: "デジタルコンテンツの性質上、購入後の返品・キャンセルは原則としてお受けできません。ただし、サービスに重大な瑕疵がある場合は個別にご対応いたします。",
  },
  {
    label: "動作環境",
    value: "iOS 15.0以上 / Android 8.0以上\n※最新版のアプリをご利用ください",
  },
];

export default function TokushohoPage() {
  return (
    <div className="page-wrapper overflow-hidden relative">
      <BackgroundDecoration />
      <main className="relative z-10 py-16 lg:py-24">
        <div className="page-container space-y-12 max-w-4xl">
          <div className="flex items-center gap-4">
            <Link
              href="/company"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-ai)] transition-colors text-sm"
            >
              ← 会社概要に戻る
            </Link>
          </div>

          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-[var(--color-border)] text-sm tracking-wide shadow-sm">
              Legal
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-igusa)]" />
            </span>
            <h1 className="section-heading">特定商取引法に基づく表記</h1>
            <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
              「よみびより」における有料サービスの販売に関する表記です。
            </p>
          </div>

          <div className="card space-y-0 p-0 overflow-hidden">
            <dl className="divide-y divide-[var(--color-border)]">
              {tokushohoItems.map((item) => (
                <div
                  key={item.label}
                  className="grid sm:grid-cols-[200px_1fr] gap-2 sm:gap-6 p-5 sm:p-6 hover:bg-[var(--color-washi)]/50 transition-colors"
                >
                  <dt className="text-sm font-semibold text-[var(--color-igusa)] tracking-wide">
                    {item.label}
                  </dt>
                  <dd className="text-[var(--color-text-primary)] whitespace-pre-line leading-relaxed">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card bg-[var(--color-washi)] border-[var(--color-igusa-pale)]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-igusa-pale)] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-[var(--color-igusa)]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-[var(--color-igusa)]">ご不明な点がございましたら</h2>
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  サービスのご利用や決済に関するご質問は、お問い合わせメールアドレスまでお気軽にご連絡ください。
                  通常2営業日以内にご返信いたします。
                </p>
                <a
                  href="mailto:d.syou@gmail.com"
                  className="inline-flex items-center gap-2 text-[var(--color-ai)] font-semibold text-sm hover:underline"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                  d.syou@gmail.com
                </a>
              </div>
            </div>
          </div>

          <footer className="text-center text-sm text-[var(--color-text-secondary)] pt-8 border-t border-[var(--color-border)]">
            <p>最終更新日：2025年11月26日</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
