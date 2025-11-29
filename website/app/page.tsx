import Image from "next/image";
import Link from "next/link";
import BackgroundDecoration from "@/components/BackgroundDecoration";

export default function Home() {
  return (
    <div className="page-wrapper overflow-hidden relative">
      <BackgroundDecoration />
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 lg:pt-32 overflow-hidden">
          <div className="page-container grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8 text-center lg:text-left animate-fade-in">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#F5F3ED] text-[#6B7B4F] text-sm font-medium tracking-wider mb-4 border border-[#EBE8DD]">
                日々を詠む、詩的SNS
              </div>
              <h1 className="section-heading leading-tight">
                日々のひとこまを、<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
                  短歌にして。
                </span>
              </h1>
              <p className="section-subheading lg:mx-0 text-lg">
                毎朝、新しい「上の句」が届きます。<br className="hidden sm:block" />
                あなたの「下の句」で、一首を完成させてみませんか。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="https://apps.apple.com/us/app/%E3%82%88%E3%81%BF%E3%81%B3%E3%82%88%E3%82%8A/id6754638890"
                  className="inline-flex items-center justify-center gap-3 bg-black text-white px-6 py-4 sm:px-4 sm:py-2 rounded-xl hover:bg-gray-800 transition-colors shadow-lg w-full sm:w-auto"
                >
                  <svg viewBox="0 0 384 512" className="w-10 h-10 sm:w-8 sm:h-8 fill-current flex-shrink-0">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
                  </svg>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[11px] sm:text-[10px] font-medium">Download on the</span>
                    <span className="text-2xl sm:text-xl font-bold -mt-1 font-sans">App Store</span>
                  </div>
                </Link>
                <Link href="#features" className="btn-secondary w-full sm:w-auto text-center">
                  使い方を見る
                </Link>
              </div>
            </div>
            <div className="relative lg:h-[600px] flex items-center justify-center animate-float delay-100">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6B7B4F]/20 to-[#FFB7C5]/20 rounded-full blur-3xl opacity-60 transform scale-110"></div>
              <div className="relative w-[280px] sm:w-[320px] rotate-[-6deg] hover:rotate-0 transition-transform duration-700 ease-out">
                <Image
                  src="/images/hero-final.png"
                  alt="よみびより アプリ画面"
                  width={600}
                  height={1200}
                  className="rounded-[32px] shadow-2xl border-4 border-white"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white/50 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent"></div>
          <div className="page-container space-y-32">

            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute inset-0 bg-[#6B7B4F]/10 rounded-full blur-3xl opacity-60 transform scale-90"></div>
                <Image
                  src="/images/feature-theme.png"
                  alt="上の句選択画面"
                  width={500}
                  height={1000}
                  className="relative rounded-2xl shadow-xl border border-white/50 mx-auto max-w-[280px]"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F3ED] text-[#6B7B4F] flex items-center justify-center mx-auto lg:mx-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">上の句を選び、下の句で響く</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  恋愛・季節・日常・ユーモアの4カテゴリから上の句を選べます。<br />
                  毎朝6:00にお題が届き、22:00に締め切り。<br />
                  みんなの下の句が集まり、一首が生まれます。
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#FFE4E8] text-[#FFB7C5] flex items-center justify-center mx-auto lg:mx-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">下の句をつむぎ、流れを共有</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  シンプルな作詩UIで五七五七七をすばやく投稿。<br />
                  スマートフォンに最適化された体験で、<br />
                  自然とことばが立ち上がるようにデザインしています。
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-[#FFB7C5]/20 rounded-full blur-3xl opacity-60 transform scale-90"></div>
                <Image
                  src="/images/feature-compose-new.png"
                  alt="下の句入力UI"
                  width={500}
                  height={1000}
                  className="relative rounded-2xl shadow-xl border border-white/50 mx-auto max-w-[280px]"
                />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="absolute inset-0 bg-[#88B04B]/10 rounded-full blur-3xl opacity-60 transform scale-90"></div>
                <Image
                  src="/images/feature-view-new.png"
                  alt="作品一覧画面"
                  width={500}
                  height={1000}
                  className="relative rounded-2xl shadow-xl border border-white/50 mx-auto max-w-[280px]"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#F0E68C]/20 text-[#D4AF37] flex items-center justify-center mx-auto lg:mx-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">響き合いを眺める</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  完成した短歌は、その日だけの物語としてタイムラインに流れます。<br />
                  共感した作品には「いいね」を送り、言葉の響き合いを楽しみましょう。<br />
                  24時間で消えてしまう、儚くも美しい一期一会の出会いがここにあります。
                </p>
              </div>
            </div>

            {/* Feature 4 (Ranking) */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#E0F2F1] text-[#009688] flex items-center justify-center mx-auto lg:mx-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0V5.625a1.125 1.125 0 00-1.125-1.125h-2.25a1.125 1.125 0 00-1.125 1.125v9.75" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">名作と出会う、ランキング</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  毎日更新されるランキングで、その日多くの共感を集めた作品を紹介します。<br />
                  心に響く名作との出会いが、あなたの感性を刺激します。
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-[#009688]/10 rounded-full blur-3xl opacity-60 transform scale-90"></div>
                <Image
                  src="/images/feature-ranking-new.png"
                  alt="ランキング画面"
                  width={500}
                  height={1000}
                  className="relative rounded-2xl shadow-xl border border-white/50 mx-auto max-w-[280px]"
                />
              </div>

            </div>
          </div>
        </section>

        {/* Sponsor Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="page-container relative z-10">
            <div className="card max-w-4xl mx-auto text-center space-y-8 bg-white/60 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-[var(--color-igusa)]">上の句スポンサー募集</h2>
              <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
                あなたの上の句が、毎朝の「お題」になります。<br />
                スポンサーとして上の句を投稿し、全国の詠み人と一緒に一首を完成させませんか。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/sponsor-guide" className="btn-primary">
                  スポンサーについて詳しく見る
                </Link>
                <Link href="/sponsors" className="btn-secondary">
                  新規登録
                </Link>
                <Link href="/sponsor-login" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-ai)] underline underline-offset-4">
                  スポンサーログイン
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-12 border-t border-[var(--color-border)] bg-white/30">
          <div className="page-container text-center space-y-8">
            <div className="text-2xl font-bold text-[var(--color-igusa)]">よみびより</div>
            <nav className="flex flex-wrap justify-center gap-8 text-sm text-[var(--color-text-secondary)]">
              <Link href="/privacy" className="hover:text-[var(--color-ai)] transition-colors">プライバシーポリシー</Link>
              <Link href="/terms" className="hover:text-[var(--color-ai)] transition-colors">利用規約</Link>
              <Link href="/support" className="hover:text-[var(--color-ai)] transition-colors">サポート</Link>
            </nav>
            <p className="text-xs text-[var(--color-text-muted)]">c 2024 Yomibiyori. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div >
  );
}
