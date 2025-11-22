import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="page-wrapper overflow-hidden">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 lg:pt-32 overflow-hidden">
          <div className="page-container grid lg:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8 text-center lg:text-left animate-fade-in">
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#F5F3ED] text-[#6B7B4F] text-sm font-medium tracking-wider mb-4 border border-[#EBE8DD]">
                和の心を紡ぐ、短歌SNS
              </div>
              <h1 className="section-heading leading-tight">
                毎日一句、<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
                  おだやかな日々を。
                </span>
              </h1>
              <p className="section-subheading lg:mx-0 text-lg">
                毎朝届く上の句に、あなたの言葉を添えて。<br className="hidden sm:block" />
                短歌のリズムが、忙しい毎日に心地よい余白を作ります。
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
                  詳しく見る
                </Link>
              </div>
            </div>
            <div className="relative lg:h-[600px] flex items-center justify-center animate-float delay-100">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6B7B4F]/20 to-[#FFB7C5]/20 rounded-full blur-3xl opacity-60 transform scale-110"></div>
              <div className="relative w-[280px] sm:w-[320px] rotate-[-6deg] hover:rotate-0 transition-transform duration-700 ease-out">
                <Image
                  src="/images/hero.png"
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
                  src="/images/hero.png"
                  alt="日替わりのお題"
                  width={500}
                  height={1000}
                  className="relative rounded-2xl shadow-xl border border-white/50 mx-auto max-w-[280px]"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F3ED] text-[#6B7B4F] flex items-center justify-center text-2xl mx-auto lg:mx-0">🎋</div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">毎朝届く、季節のお題</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  恋愛、季節、日常、ユーモア。<br />
                  毎朝6時、新しい上の句があなたの元へ。<br />
                  ふとした瞬間に浮かぶ言葉を、短歌という器に。
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#FFE4E8] text-[#FFB7C5] flex items-center justify-center text-2xl mx-auto lg:mx-0">📱</div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">縦書きで綴る、日本語の美</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  古来より続く「縦書き」の心地よさを、<br />
                  現代のスマートフォンで再現しました。<br />
                  文字が流れるように配置される美しさを体験してください。
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-[#FFB7C5]/20 rounded-full blur-3xl opacity-60 transform scale-90"></div>
                <Image
                  src="/images/feature-compose.png"
                  alt="縦書きのUI"
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
                  src="/images/feature-view.png"
                  alt="感性の共有"
                  width={500}
                  height={1000}
                  className="relative rounded-2xl shadow-xl border border-white/50 mx-auto max-w-[280px]"
                />
              </div>
              <div className="order-1 lg:order-2 space-y-6 text-center lg:text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#F0E68C]/20 text-[#D4AF37] flex items-center justify-center text-2xl mx-auto lg:mx-0">✨</div>
                <h2 className="text-3xl font-bold text-[var(--color-igusa)]">感性を共有する</h2>
                <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                  他のユーザーが詠んだ歌に触れる。<br />
                  「いいね」やランキングで、<br />
                  言葉の響き合いを楽しめます。
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Sponsor Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="page-container relative z-10">
            <div className="card max-w-4xl mx-auto text-center space-y-8 bg-white/60 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-[var(--color-igusa)]">企業・団体の方へ</h2>
              <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
                和の世界観を大切にしたまま、ブランドメッセージを短歌の形で届けられます。<br />
                verified スポンサーには、お題投稿・配信管理ダッシュボードを提供しています。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/sponsors" className="btn-primary">
                  スポンサー登録
                </Link>
                <Link href="/support" className="btn-secondary">
                  導入相談
                </Link>
                <Link href="/sponsor-login" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-ai)] underline underline-offset-4">
                  ログインはこちら
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
            <p className="text-xs text-[var(--color-text-muted)]">© 2024 Yomibiyori. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
