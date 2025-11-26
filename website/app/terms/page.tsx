import Link from "next/link";
import type { Metadata } from "next";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export const metadata: Metadata = {
  title: "利用規約 | よみびより",
  description: "よみびよりの利用規約",
};

const sections = [
  {
    id: "scope",
    title: "第1条（適用）",
    content: [
      "本規約は、当サービスの提供条件および当サービスの利用に関する当サービスとユーザーとの間の権利義務関係を定めることを目的とし、ユーザーと当サービスとの間の当サービスの利用に関わる一切の関係に適用されます。",
      "本規約の内容と、前項の規定以外の当サービスの説明等が異なる場合、本規約の規定が優先して適用されるものとします。",
    ],
  },
  {
    id: "definitions",
    title: "第2条（定義）",
    description: "本規約において使用する以下の用語は、各々以下に定める意味を有するものとします。",
    items: [
      { term: "サービス", definition: "よみびよりという名称のサービスを意味します。" },
      { term: "ユーザー", definition: "当サービスを利用する全ての方を意味します。" },
      { term: "作品", definition: "ユーザーが当サービス上に投稿した下の句および完成した短歌を意味します。" },
      { term: "お題", definition: "当サービスが提供する上の句を意味します。" },
    ],
  },
  {
    id: "registration",
    title: "第3条（利用登録）",
    content: [
      "当サービスの利用を希望する方は、本規約に同意の上、所定の方法により利用登録を申請することができます。",
    ],
    subItems: [
      "本規約に違反するおそれがあると認められる場合",
      "登録事項に虚偽、誤記または記載漏れがあった場合",
      "過去に当サービスの利用停止処分を受けたことがある場合",
      "その他、登録が適当でないと判断した場合",
    ],
    subItemsTitle: "当サービスは、登録申請者が以下のいずれかに該当する場合、登録を拒否することがあります。",
  },
  {
    id: "account",
    title: "第4条（アカウント管理）",
    content: [
      "ユーザーは、自己の責任において、アカウント情報を管理するものとします。",
      "ユーザーは、いかなる場合にも、アカウント情報を第三者に譲渡または貸与することはできません。",
      "アカウント情報の管理不十分、使用上の過誤、第三者の使用等による損害の責任はユーザーが負うものとし、当サービスは一切の責任を負いません。",
    ],
  },
  {
    id: "content",
    title: "第5条（投稿コンテンツ）",
    content: [
      "ユーザーは、投稿する作品について、自らが投稿その他の送信を適法に行う権利を有していること、および作品が第三者の権利を侵害していないことについて、当サービスに対し表明し保証するものとします。",
      "ユーザーは、作品について、当サービスに対し、世界的、非独占的、無償、サブライセンス可能かつ譲渡可能な使用許諾をしたものとみなされます。",
      "ユーザーは、当サービスに対し、著作者人格権を行使しないことに同意するものとします。",
    ],
  },
];

const prohibitedActions = [
  "法令または公序良俗に違反する行為",
  "犯罪行為に関連する行為",
  "当サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為",
  "当サービスのネットワークまたはシステム等に過度な負荷をかける行為",
  "当サービスの運営を妨害するおそれのある行為",
  "当サービスのシステムに不正にアクセスし、または不正なアクセスを試みる行為",
  "第三者に成りすます行為",
  "当サービスの他のユーザーのアカウント情報を利用する行為",
  "当サービスが許諾しない方法による商業行為",
  "その他、当サービスが不適切と判断する行為",
];

const prohibitedContent = [
  "過度に暴力的な表現",
  "露骨な性的表現",
  "人種、国籍、信条、性別、社会的身分、門地等による差別につながる表現",
  "自殺、自傷行為、薬物乱用を誘引または助長する表現",
  "その他反社会的な内容を含み他人に不快感を与える表現",
];

export default function Terms() {
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
              Terms of Service
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] leading-tight">
              利用規約
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
              本利用規約は、よみびよりの利用条件を定めるものです。<br className="hidden sm:block" />
              ユーザーの皆様には、本規約に同意の上、ご利用いただきます。
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">最終更新日：2024年10月30日</p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 bg-white/50 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent"></div>
          <div className="page-container max-w-4xl space-y-8">

            {/* Quick Navigation */}
            <div className="card bg-[var(--color-washi)]">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">目次</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "第1条 適用",
                  "第2条 定義",
                  "第3条 利用登録",
                  "第4条 アカウント管理",
                  "第5条 投稿コンテンツ",
                  "第6条 禁止事項",
                  "第7条 利用制限",
                  "第8条 免責",
                  "第9条 サービス変更",
                  "第10条 規約変更",
                  "第11条 個人情報",
                  "第12条〜14条 その他",
                ].map((item, i) => (
                  <span key={i} className="text-sm text-[var(--color-text-secondary)]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Sections 1-5 */}
            {sections.map((section) => (
              <div key={section.id} className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{section.title}</h2>
                {section.description && (
                  <p className="text-[var(--color-text-secondary)] mb-4">{section.description}</p>
                )}
                {section.items && (
                  <div className="space-y-3 mb-4">
                    {section.items.map((item, i) => (
                      <div key={i} className="bg-[var(--color-washi)] rounded-lg p-4 border border-[var(--color-border)]">
                        <span className="font-medium text-[var(--color-igusa)]">「{item.term}」</span>
                        <span className="text-[var(--color-text-secondary)]">とは、{item.definition}</span>
                      </div>
                    ))}
                  </div>
                )}
                {section.content && (
                  <ol className="list-decimal pl-6 space-y-3 text-[var(--color-text-secondary)]">
                    {section.content.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                )}
                {section.subItemsTitle && (
                  <div className="mt-4">
                    <p className="text-[var(--color-text-secondary)] mb-3">{section.subItemsTitle}</p>
                    <ul className="space-y-2 pl-4">
                      {section.subItems?.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--color-text-secondary)]">
                          <span className="text-[var(--color-igusa)]">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Section 6: Prohibited Actions */}
            <div className="card hover:shadow-xl transition-shadow border-l-4 border-l-red-400">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">第6条（禁止事項）</h2>
              <p className="text-[var(--color-text-secondary)] mb-4">
                ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <div className="space-y-2 mb-6">
                {prohibitedActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3 text-[var(--color-text-secondary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    {action}
                  </div>
                ))}
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-2">以下の内容を含む情報の送信も禁止されています：</p>
                <ul className="space-y-1">
                  {prohibitedContent.map((content, i) => (
                    <li key={i} className="text-sm text-red-700 flex items-center gap-2">
                      <span>•</span>
                      {content}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Section 7-8 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">第7条（利用制限および登録抹消）</h2>
                <p className="text-[var(--color-text-secondary)] mb-3">
                  当サービスは、ユーザーが以下のいずれかに該当する場合、事前の通知なく、利用を制限またはアカウントを削除することができます。
                </p>
                <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                  <li className="flex items-start gap-2"><span className="text-[var(--color-igusa)]">•</span>本規約に違反した場合</li>
                  <li className="flex items-start gap-2"><span className="text-[var(--color-igusa)]">•</span>登録事項に虚偽があった場合</li>
                  <li className="flex items-start gap-2"><span className="text-[var(--color-igusa)]">•</span>その他不適当と判断した場合</li>
                </ul>
              </div>
              <div className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">第8条（保証の否認および免責）</h2>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  当サービスは、サービスに瑕疵がないことを保証しません。また、サービスに起因してユーザーに生じた損害について、消費者契約法の適用がある場合を除き、一切の責任を負いません。
                </p>
              </div>
            </div>

            {/* Section 9-10 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">第9条（サービス内容の変更等）</h2>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  当サービスは、ユーザーへの事前の告知をもって、サービスの内容を変更、追加または廃止することがあり、ユーザーはこれを承諾するものとします。
                </p>
              </div>
              <div className="card hover:shadow-xl transition-shadow">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">第10条（利用規約の変更）</h2>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  当サービスは、必要と判断した場合、本規約を変更することができます。変更後、ユーザーがサービスを利用した場合、変更に同意したものとみなします。
                </p>
              </div>
            </div>

            {/* Section 11-14 */}
            <div className="card hover:shadow-xl transition-shadow">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">第11条〜第14条（その他の規定）</h2>
              <div className="space-y-4">
                <div className="bg-[var(--color-washi)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="font-medium text-[var(--color-text-primary)] mb-1">第11条 個人情報の取扱い</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    個人情報については、<Link href="/privacy" className="text-[var(--color-igusa)] underline hover:no-underline">プライバシーポリシー</Link>に従い適切に取り扱います。
                  </p>
                </div>
                <div className="bg-[var(--color-washi)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="font-medium text-[var(--color-text-primary)] mb-1">第12条 通知または連絡</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    ユーザーと当サービスとの間の通知または連絡は、当サービスの定める方法によって行います。
                  </p>
                </div>
                <div className="bg-[var(--color-washi)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="font-medium text-[var(--color-text-primary)] mb-1">第13条 権利義務の譲渡の禁止</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    ユーザーは、当サービスの書面による事前の承諾なく、権利または義務を第三者に譲渡できません。
                  </p>
                </div>
                <div className="bg-[var(--color-washi)] rounded-lg p-4 border border-[var(--color-border)]">
                  <p className="font-medium text-[var(--color-text-primary)] mb-1">第14条 準拠法・裁判管轄</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    本規約の解釈には日本法を準拠法とし、紛争が生じた場合には当サービスの所在地を管轄する裁判所を専属的合意管轄とします。
                  </p>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="card bg-gradient-to-br from-[var(--color-igusa)]/5 to-[var(--color-sakura)]/5 border-[var(--color-igusa)]/20">
              <div className="text-center space-y-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">お問い合わせ</h2>
                <p className="text-[var(--color-text-secondary)]">
                  本規約に関するご質問やご要望は、サポートページからお問い合わせください。
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
                <Link href="/privacy" className="text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors">プライバシーポリシー</Link>
                <Link href="/support" className="text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors">サポート</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
