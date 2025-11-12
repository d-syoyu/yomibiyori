import Link from "next/link";

const highlights = [
  {
    icon: "🎋",
    title: "日替わりのお題",
    body: "恋愛、季節、日常、ユーモア。毎朝6時、新しい上の句が届きます。",
  },
  {
    icon: "✨",
    title: "リアルタイム評価",
    body: "感謝(いいね)とランキングで、短歌の響きを共有できます。",
  },
  {
    icon: "📱",
    title: "縦書きの美",
    body: "モバイルアプリの縦書きUIを踏襲した、美しい鑑賞体験。",
  },
];

export default function Home() {
  return (
    <div className="page-wrapper">
      <main className="page-container space-y-16">
        <header className="text-center space-y-6">
          <h1 className="section-heading">よみびより</h1>
          <p className="section-subheading">
            毎日届く上の句に、あなたの下の句で応える。和の質感とモダンUIを融合した、短歌SNSです。
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="card space-y-3 text-center">
              <div className="text-4xl">{item.icon}</div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </section>

        <section className="card space-y-6 text-center">
          <h2 className="section-heading text-3xl">スポンサータイアップ</h2>
          <p className="section-subheading">
            和の世界観を大切にしたまま、ブランドメッセージを短歌の形で届けられます。 verified スポンサーには、お題投稿・配信管理ダッシュボードを提供しています。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sponsors" className="btn-primary">
              スポンサー登録ページへ
            </Link>
            <Link href="/support" className="btn-secondary">
              導入相談をする
            </Link>
          </div>
        </section>

        <footer className="text-center space-y-4 py-8 border-t border-[var(--color-border)]">
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-[var(--color-text-secondary)]">
            <Link href="/privacy">プライバシーポリシー</Link>
            <Link href="/terms">利用規約</Link>
            <Link href="/support">サポート</Link>
          </nav>
          <p className="text-sm text-[var(--color-text-muted)]">© 2024 Yomibiyori. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
