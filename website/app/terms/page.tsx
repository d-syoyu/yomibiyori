import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | よみびより",
  description: "よみびよりの利用規約",
};

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8">
          <Link href="/" className="text-amber-900 hover:text-amber-700 transition-colors">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-8 font-serif">
          利用規約
        </h1>

        <div className="prose prose-amber max-w-none bg-white rounded-lg p-8 shadow-sm border border-amber-100">
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              本利用規約（以下「本規約」）は、よみびより（以下「当サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に同意の上、当サービスをご利用いただきます。
            </p>
            <p className="text-sm text-gray-500">最終更新日：2024年10月30日</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第1条（適用）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>本規約は、当サービスの提供条件および当サービスの利用に関する当サービスとユーザーとの間の権利義務関係を定めることを目的とし、ユーザーと当サービスとの間の当サービスの利用に関わる一切の関係に適用されます。</li>
              <li>本規約の内容と、前項の規定以外の当サービスの説明等が異なる場合、本規約の規定が優先して適用されるものとします。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第2条（定義）</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              本規約において使用する以下の用語は、各々以下に定める意味を有するものとします。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>「サービス」とは、よみびよりという名称のサービスを意味します。</li>
              <li>「ユーザー」とは、当サービスを利用する全ての方を意味します。</li>
              <li>「作品」とは、ユーザーが当サービス上に投稿した下の句および完成した短歌を意味します。</li>
              <li>「お題」とは、当サービスが提供する上の句を意味します。</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第3条（利用登録）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスの利用を希望する方は、本規約に同意の上、所定の方法により利用登録を申請することができます。</li>
              <li>当サービスは、登録申請者が以下のいずれかに該当する場合、登録を拒否することがあります。
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>本規約に違反するおそれがあると認められる場合</li>
                  <li>登録事項に虚偽、誤記または記載漏れがあった場合</li>
                  <li>過去に当サービスの利用停止処分を受けたことがある場合</li>
                  <li>その他、登録が適当でないと判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第4条（アカウント管理）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>ユーザーは、自己の責任において、アカウント情報を管理するものとします。</li>
              <li>ユーザーは、いかなる場合にも、アカウント情報を第三者に譲渡または貸与することはできません。</li>
              <li>アカウント情報の管理不十分、使用上の過誤、第三者の使用等による損害の責任はユーザーが負うものとし、当サービスは一切の責任を負いません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第5条（投稿コンテンツ）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>ユーザーは、投稿する作品について、自らが投稿その他の送信を適法に行う権利を有していること、および作品が第三者の権利を侵害していないことについて、当サービスに対し表明し保証するものとします。</li>
              <li>ユーザーは、作品について、当サービスに対し、世界的、非独占的、無償、サブライセンス可能かつ譲渡可能な使用許諾をしたものとみなされます。</li>
              <li>ユーザーは、当サービスに対し、著作者人格権を行使しないことに同意するものとします。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第6条（禁止事項）</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
              <li>当サービスを通じ、以下の内容を含む情報を送信する行為
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>過度に暴力的な表現</li>
                  <li>露骨な性的表現</li>
                  <li>人種、国籍、信条、性別、社会的身分、門地等による差別につながる表現</li>
                  <li>自殺、自傷行為、薬物乱用を誘引または助長する表現</li>
                  <li>その他反社会的な内容を含み他人に不快感を与える表現</li>
                </ul>
              </li>
              <li>当サービスのネットワークまたはシステム等に過度な負荷をかける行為</li>
              <li>当サービスの運営を妨害するおそれのある行為</li>
              <li>当サービスのシステムに不正にアクセスし、または不正なアクセスを試みる行為</li>
              <li>第三者に成りすます行為</li>
              <li>当サービスの他のユーザーのアカウント情報を利用する行為</li>
              <li>当サービスが許諾しない方法による商業行為</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第7条（利用制限および登録抹消）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスは、ユーザーが以下のいずれかに該当する場合、事前の通知なく、当該ユーザーの利用を制限し、またはアカウントを削除することができるものとします。
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>本規約のいずれかの条項に違反した場合</li>
                  <li>登録事項に虚偽の事実があることが判明した場合</li>
                  <li>その他、当サービスが利用を適当でないと判断した場合</li>
                </ul>
              </li>
              <li>当サービスは、本条に基づき当サービスが行った行為によりユーザーに生じた損害について、一切の責任を負いません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第8条（保証の否認および免責）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスは、当サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを保証するものではありません。</li>
              <li>当サービスは、当サービスに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。ただし、消費者契約法の適用がある場合、この免責規定は適用されません。</li>
              <li>当サービスは、当サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第9条（サービス内容の変更等）</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、ユーザーへの事前の告知をもって、当サービスの内容を変更、追加または廃止することがあり、ユーザーはこれを承諾するものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第10条（利用規約の変更）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>当サービスは、必要と判断した場合、本規約を変更することができるものとします。</li>
              <li>当サービスは、本規約を変更した場合、ユーザーに当該変更内容を通知するものとし、当該変更内容の通知後、ユーザーが当サービスを利用した場合または当サービスの定める期間内に登録抹消の手続をとらなかった場合には、ユーザーは、本規約の変更に同意したものとみなします。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第11条（個人情報の取扱い）</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、当サービスの利用によって取得する個人情報については、
              <Link href="/privacy" className="text-amber-900 underline hover:text-amber-700">
                プライバシーポリシー
              </Link>
              に従い適切に取り扱うものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第12条（通知または連絡）</h2>
            <p className="text-gray-700 leading-relaxed">
              ユーザーと当サービスとの間の通知または連絡は、当サービスの定める方法によって行うものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第13条（権利義務の譲渡の禁止）</h2>
            <p className="text-gray-700 leading-relaxed">
              ユーザーは、当サービスの書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">第14条（準拠法・裁判管轄）</h2>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700">
              <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
              <li>当サービスに関して紛争が生じた場合には、当サービスの所在地を管轄する裁判所を専属的合意管轄とします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-900 mb-4">お問い合わせ</h2>
            <p className="text-gray-700 leading-relaxed">
              本規約に関するご質問やご要望は、
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
