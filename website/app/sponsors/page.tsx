'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createSponsorProfile } from '@/lib/sponsorApi'
import BackgroundDecoration from '@/components/BackgroundDecoration'
import { Spinner } from '@/components/ui/Spinner'

export default function SponsorsPage() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 既にログイン済みならダッシュボードへリダイレクト
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.push('/sponsor')
          return
        }
      } catch (err) {
        console.error('Session check failed:', err)
      } finally {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [router])

  async function handleSignUpAndRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    // Validate password
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    try {
      setLoading(true)

      // 1. Sign up with Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('このメールアドレスは既に登録されています。ログインページからログインしてください。')
        }
        throw signUpError
      }

      if (!signUpData.user) {
        throw new Error('アカウント作成に失敗しました')
      }

      // 2. Create sponsor profile
      await createSponsorProfile({
        company_name: companyName.trim(),
        contact_email: email.trim(),
        plan_tier: 'standard',
      })

      setSuccessMessage('スポンサー登録が完了しました。審査完了後にお題投稿が可能になります。')

      // Redirect to sponsor dashboard after a short delay
      setTimeout(() => {
        router.push('/sponsor')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // セッションチェック中はローディング表示
  if (checkingSession) {
    return (
      <div className="page-wrapper relative overflow-hidden">
        <BackgroundDecoration />
        <div className="page-container flex flex-col justify-center items-center min-h-[50vh] gap-4">
          <Spinner size="lg" />
          <p className="text-[var(--color-text-secondary)]">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper relative overflow-hidden">
      <BackgroundDecoration />
      <main className="page-container space-y-8 md:space-y-12 px-4 pb-12 relative z-10">
        {/* Hero Section */}
        <header className="text-center space-y-4 md:space-y-6 pt-8 md:pt-12">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            企業・団体様向け
          </div>
          <h1 className="section-heading text-3xl md:text-4xl lg:text-5xl">
            ブランドの物語を、<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">短歌という器で。</span>
          </h1>
          <p className="section-subheading text-base md:text-lg max-w-3xl mx-auto">
            「よみびより」は、言葉を大切にするユーザーが集まるコミュニティです。<br className="hidden sm:block" />
            貴社のメッセージをお題として提供し、ユーザーとの深いエンゲージメントを築きませんか。
          </p>
        </header>

        {/* Registration Form Section */}
        <section className="max-w-2xl mx-auto">
          <div className="card space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">スポンサー登録</h2>
              <p className="text-sm md:text-base text-[var(--color-text-secondary)]">
                まずはアカウントを作成し、企業情報をご登録ください。
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                {successMessage}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSignUpAndRegister}>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    企業名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                    placeholder="例: 株式会社よみびより"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                    placeholder="sponsor@example.com"
                  />
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    ログインや審査結果の通知に使用します
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    パスワード <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                    placeholder="6文字以上"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    パスワード（確認） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                    placeholder="パスワードを再入力"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? '登録中...' : 'スポンサー登録を申し込む'}
                </button>

                <p className="text-center text-sm text-[var(--color-text-muted)]">
                  すでにアカウントをお持ちですか？{' '}
                  <Link href="/sponsor-login" className="text-[var(--color-igusa)] hover:underline">
                    ログイン
                  </Link>
                </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="py-8 md:py-12 border-t border-[var(--color-border)] bg-white/30 mt-12 md:mt-24">
        <div className="max-w-7xl mx-auto text-center space-y-4 md:space-y-6 px-4">
          <div className="text-xl md:text-2xl font-bold text-[var(--color-igusa)]">よみびより</div>
          <nav className="flex flex-wrap justify-center gap-3 md:gap-8 text-xs md:text-sm text-[var(--color-text-secondary)]">
            <Link href="/" className="hover:text-[var(--color-ai)] transition-colors">トップページ</Link>
            <Link href="/privacy" className="hover:text-[var(--color-ai)] transition-colors">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-[var(--color-ai)] transition-colors">利用規約</Link>
            <Link href="/support" className="hover:text-[var(--color-ai)] transition-colors">サポート</Link>
          </nav>
          <p className="text-xs text-[var(--color-text-muted)]">© 2024 Yomibiyori. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
