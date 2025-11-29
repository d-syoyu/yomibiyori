import Link from "next/link";
import Image from "next/image";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export default function SponsorGuide() {
  return (
    <div className="page-wrapper relative overflow-hidden">
      <BackgroundDecoration />
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-50 pt-8 px-6">
        <div className="page-container flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[var(--color-border)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ホームに戻る
          </Link>
        </div>
      </header>

      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          <div className="page-container grid lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="space-y-8 text-center lg:text-left animate-fade-in">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#F5F3ED] text-[#6B7B4F] text-sm font-medium tracking-wider mb-4 border border-[#EBE8DD]">
                企業・団体様向けパートナーシップ
              </div>
              <h1 className="section-heading text-4xl md:text-5xl lg:text-6xl leading-tight">
                その想いを、<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
                  三十一文字の物語に。
                </span>
              </h1>
              <p className="section-subheading text-lg md:text-xl leading-relaxed text-[var(--color-text-secondary)]">
                「よみびより」は、日々の感動を短歌にするSNSです。<br />
                貴社のメッセージを「上の句」として届け、<br className="hidden sm:block" />
                ユーザーと共に新しい物語を紡ぎませんか。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                <Link href="/sponsors" className="btn-primary shadow-lg hover:shadow-xl transition-all">
                  スポンサー登録を申し込む
                </Link>
                <Link href="#features" className="btn-secondary bg-white/50 backdrop-blur-sm">
                  詳しく見る
                </Link>
              </div>
            </div>
            
            {/* Hero Image Composition */}
            <div className="relative lg:h-[600px] flex items-center justify-center animate-float delay-100 hidden lg:flex">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6B7B4F]/20 to-[#FFB7C5]/20 rounded-full blur-3xl opacity-60 transform scale-110"></div>
              {/* Mockup or Abstract Represenation */}
              <div className="relative w-[320px] rotate-[-6deg] hover:rotate-0 transition-transform duration-700 ease-out z-10">
                <Image
                  src="/home.png"
                  alt="よみびより アプリ画面"
                  width={600}
                  height={1200}
                  className="rounded-[32px] shadow-2xl border-4 border-white"
                  priority
                />
                {/* Floating Badge */}
                <div className="absolute -bottom-12 -left-12 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/50 max-w-xs animate-fade-in delay-300">
                   <p className="text-sm text-[var(--color-text-secondary)]">
                     貴社のブランドメッセージが、<br/>毎朝のお題になります。
                   </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Concept Section: The Value of "Odai" */}
        <section id="features" className="py-24 bg-white/50 relative scroll-mt-20">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent"></div>
          
          <div className="page-container space-y-32">
            
            {/* Feature 1: Visibility */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative group">
                <div className="absolute inset-0 bg-[#6B7B4F]/10 rounded-full blur-3xl opacity-60 transform scale-90 group-hover:scale-100 transition-transform duration-700"></div>
                <div className="relative mx-auto max-w-[320px]">
                   <Image
                     src="/home.png"
                     alt="お題選択画面のイメージ"
                     width={500}
                     height={1000}
                     className="rounded-3xl shadow-2xl border-4 border-white transform transition-transform duration-500 group-hover:scale-[1.02]"
                   />
                   {/* Overlay Annotation */}
                   <div className="absolute top-1/4 -right-8 bg-[var(--color-igusa)] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold animate-bounce delay-700">
                     ここに表示されます
                   </div>
                </div>
              </div>
              <div className="order-1 lg:order-2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-washi-dark)] text-[var(--color-igusa)] flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                   </svg>
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">
                  ブランドの「はじまり」を届ける
                </h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  ユーザーがアプリを開いて最初に出会うのが「お題」です。
                  貴社の商品や季節のメッセージを「上の句（5-7-5）」として提供することで、
                  自然な形でブランド認知を高めることができます。
                </p>
                <ul className="space-y-3 pt-4">
                  <li className="flex items-center gap-3 text-[var(--color-text-primary)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-igusa)]"></span>
                    <span>詠む画面でお題として掲載</span>
                  </li>
                  <li className="flex items-center gap-3 text-[var(--color-text-primary)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-igusa)]"></span>
                    <span>企業名・ロゴの表示が可能</span>
                  </li>
                  <li className="flex items-center gap-3 text-[var(--color-text-primary)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-igusa)]"></span>
                    <span>「季節」「日常」などカテゴリ選択が可能</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2: Engagement */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                 <div className="w-14 h-14 rounded-2xl bg-[var(--color-sakura-pale)] text-[var(--color-sakura)] flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                   </svg>
                 </div>
                 <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">
                   「共感」でつながる、深い体験
                 </h2>
                 <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                   一方的な広告閲覧ではなく、ユーザー自身が「下の句」を考え、創作に参加します。
                   この能動的なプロセスが、ブランドへの深い理解と愛着（エンゲージメント）を育みます。
                 </p>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-[#FFB7C5]/20 rounded-full blur-3xl opacity-60 transform scale-90 group-hover:scale-100 transition-transform duration-700"></div>
                <div className="relative mx-auto max-w-[320px]">
                   <Image
                     src="/compose.png"
                     alt="投稿画面のイメージ"
                     width={500}
                     height={1000}
                     className="rounded-3xl shadow-2xl border-4 border-white transform transition-transform duration-500 group-hover:scale-[1.02]"
                   />
                </div>
              </div>
            </div>

            {/* Feature 3: Data & Insight */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative group">
                 <div className="absolute inset-0 bg-[#88B04B]/10 rounded-full blur-3xl opacity-60 transform scale-90 group-hover:scale-100 transition-transform duration-700"></div>
                 {/* Insights Screenshot */}
                 <div className="relative">
                   <Image
                     src="/insights_1.png"
                     alt="インサイト画面"
                     width={800}
                     height={600}
                     className="rounded-2xl shadow-2xl border-4 border-white transform transition-transform duration-500 group-hover:scale-[1.02]"
                   />
                 </div>
              </div>
              <div className="order-1 lg:order-2 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-igusa-pale)] text-[var(--color-igusa-dark)] flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                   </svg>
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">
                  反響を可視化する
                </h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  投稿数や閲覧数、「いいね」の数など、キャンペーンの効果を専用ダッシュボードでリアルタイムに確認できます。
                  どのような言葉がユーザーに響いたのか、定性・定量の両面から分析可能です。
                </p>
              </div>
            </div>

            {/* Insights Gallery */}
            <div className="pt-16">
              <h3 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-8">
                詳細なインサイト分析
              </h3>
              <p className="text-center text-[var(--color-text-secondary)] mb-12 max-w-2xl mx-auto">
                お題ごとの詳細な分析データを確認できます。投稿された作品の傾向や、ユーザーの反応を多角的に把握。
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="group">
                  <Image
                    src="/insights_1.png"
                    alt="インサイト画面 - 概要"
                    width={400}
                    height={300}
                    className="rounded-xl shadow-lg border border-[var(--color-border)] transform transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <p className="text-center text-sm text-[var(--color-text-muted)] mt-3">投稿数・閲覧数の推移</p>
                </div>
                <div className="group">
                  <Image
                    src="/insights_2.png"
                    alt="インサイト画面 - 詳細"
                    width={400}
                    height={300}
                    className="rounded-xl shadow-lg border border-[var(--color-border)] transform transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <p className="text-center text-sm text-[var(--color-text-muted)] mt-3">投稿作品の一覧</p>
                </div>
                <div className="group">
                  <Image
                    src="/insights_3.png"
                    alt="インサイト画面 - 分析"
                    width={400}
                    height={300}
                    className="rounded-xl shadow-lg border border-[var(--color-border)] transform transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <p className="text-center text-sm text-[var(--color-text-muted)] mt-3">エンゲージメント分析</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Flow Section */}
        <section className="py-24">
          <div className="page-container">
            <h2 className="text-3xl font-bold text-center text-[var(--color-text-primary)] mb-16">
              配信までのステップ
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
               {[
                 { step: "01", title: "アカウント登録", desc: "企業情報をご登録いただき、審査を行います。", icon: (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                   </svg>
                 )},
                 { step: "02", title: "お題の作成", desc: "ダッシュボードから、上の句と配信日時を設定。", icon: (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                   </svg>
                 )},
                 { step: "03", title: "配信・投稿受付", desc: "指定日の朝6時に配信開始。ユーザーが作品を投稿。", icon: (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                   </svg>
                 )},
                 { step: "04", title: "レポート確認", desc: "集まった作品や反響データをダッシュボードで確認。", icon: (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                   </svg>
                 )},
               ].map((item, idx) => (
                 <div key={idx} className="relative group">
                   <div className="h-full bg-white p-8 rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                     <div className="w-14 h-14 rounded-2xl bg-[var(--color-washi-dark)] text-[var(--color-igusa)] flex items-center justify-center mb-4">{item.icon}</div>
                     <div className="text-xs font-bold text-[var(--color-igusa)] tracking-widest mb-2">STEP {item.step}</div>
                     <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">{item.title}</h3>
                     <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{item.desc}</p>
                   </div>
                   {/* Connector Line */}
                   {idx < 3 && (
                     <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-[var(--color-border)] transform -translate-y-1/2 z-[-1]"></div>
                   )}
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="page-container pb-32">
          <div className="card bg-gradient-to-br from-[var(--color-washi)] to-white p-12 lg:p-20 text-center space-y-8 shadow-xl border border-[var(--color-border)] rounded-[3rem]">
             <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-[var(--color-igusa)]">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
               </svg>
             </div>
             <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-igusa)]">
               言葉の力で、<br className="sm:hidden" />心を動かすマーケティングを。
             </h2>
             <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
               まずはアカウントを作成し、管理画面のデモをご覧ください。<br />
               導入に関するご相談も承っております。
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
               <Link href="/sponsors" className="btn-primary text-lg px-10 py-4 shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                 無料でスポンサー登録
               </Link>
               <Link href="/support" className="btn-secondary text-lg px-10 py-4 bg-white">
                 お問い合わせ
               </Link>
             </div>
          </div>
        </section>

      </main>

      <footer className="py-12 border-t border-[var(--color-border)] bg-white/30">
          <div className="page-container text-center space-y-8">
            <div className="text-2xl font-bold text-[var(--color-igusa)]">よみびより</div>
            <nav className="flex flex-wrap justify-center gap-8 text-sm text-[var(--color-text-secondary)]">
              <Link href="/privacy" className="hover:text-[var(--color-ai)] transition-colors">プライバシーポリシー</Link>
              <Link href="/terms" className="hover:text-[var(--color-ai)] transition-colors">利用規約</Link>
              <Link href="/support" className="hover:text-[var(--color-ai)] transition-colors">サポート</Link>
            </nav>
            <p className="text-xs text-[var(--color-text-muted)]">© 2024 Yomibiyori. All rights reserved.</p>
          </div>
        </footer>
    </div>
  );
}