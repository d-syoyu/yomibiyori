import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-amber-900 mb-4 font-serif">
            よみびより
          </h1>
          <p className="text-xl md:text-2xl text-amber-800 font-light">
            毎日新しいお題で、言葉を紡ぐ喜びを
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="space-y-12">
          <section className="text-center">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              毎日届く上の句に、あなたの下の句で応える。
              <br />
              短歌で紡ぐ、言葉の世界。
            </p>
          </section>

          {/* 特徴 */}
          <section className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-amber-100">
              <div className="text-4xl mb-4">🎋</div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                日替わりのお題
              </h3>
              <p className="text-gray-600 text-sm">
                恋愛、季節、日常、ユーモア。毎日新しい上の句が届きます。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-amber-100">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                リアルタイム評価
              </h3>
              <p className="text-gray-600 text-sm">
                他のユーザーの作品を鑑賞し、いいねで評価。ランキングも楽しめます。
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-amber-100">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                縦書きの美
              </h3>
              <p className="text-gray-600 text-sm">
                日本の伝統的な縦書き表示で、短歌本来の美しさを体験できます。
              </p>
            </div>
          </section>
        </div>

        {/* フッター */}
        <footer className="mt-24 pt-8 border-t border-amber-200">
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <Link href="/privacy" className="hover:text-amber-900 transition-colors">
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="hover:text-amber-900 transition-colors">
              利用規約
            </Link>
            <Link href="/support" className="hover:text-amber-900 transition-colors">
              サポート
            </Link>
          </nav>
          <p className="text-center mt-6 text-sm text-gray-500">
            © 2024 Yomibiyori. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
