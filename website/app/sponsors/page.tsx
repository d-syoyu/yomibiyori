'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import {
  SponsorProfile,
  createSponsorProfile,
  fetchSponsorProfile,
} from '@/lib/sponsorApi'
import BackgroundDecoration from '@/components/BackgroundDecoration'

export default function SponsorsPage() {
  const supabase = useMemo(() => getSupabase(), [])
  const router = useRouter()
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [profile, setProfile] = useState<SponsorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form fields
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(Boolean(session))
      setSessionChecked(true)
    }
    void initSession()
  }, [supabase])

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchSponsorProfile()
      setProfile(data)
      setCompanyName(data.company_name)
    } catch (err) {
      if (err instanceof Error && err.message.toLowerCase().includes('not found')) {
        setProfile(null)
      } else {
        setError(err instanceof Error ? err.message : 'プロフィール取得に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (hasSession) {
      void loadProfile()
    }
  }, [hasSession, loadProfile])

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
      const payload = await createSponsorProfile({
        company_name: companyName.trim(),
        contact_email: email.trim(),
        plan_tier: 'standard',
      })

      setProfile(payload)
      setHasSession(true)
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

  async function handleExistingUserRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      setLoading(true)
      const payload = await createSponsorProfile({
        company_name: companyName.trim(),
        plan_tier: 'standard',
      })
      setProfile(payload)
      setSuccessMessage('スポンサー登録が完了しました。審査完了後にお題投稿が可能になります。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-washi)]">
        <p className="text-[var(--color-text-secondary)]">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="page-wrapper relative overflow-hidden">
      <BackgroundDecoration />
      <main className="page-container space-y-12 md:space-y-24 px-4 pb-12 relative z-10">
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

        {/* Features Grid */}
        <section className="grid md:grid-cols-2 gap-6 md:gap-12">
          {/* Topic Management */}
          <div className="card space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-washi-dark)] text-[var(--color-igusa)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">直感的なお題管理</h3>
            <p className="text-[var(--color-text-secondary)]">
              専用ダッシュボードから、お題（上の句）を作成・提出できます。
              運営の審査を経て承認されたお題が、指定した日付にユーザーに配信されます。
              審査結果や配信状況は、リアルタイムで通知されます。
            </p>
            <div className="bg-[var(--color-washi)] rounded-xl p-4 border border-[var(--color-border)] text-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-muted)]">配信日: 2025/01/15</span>
                <span className="text-xs font-medium text-green-600 border border-green-600 px-2 py-0.5 rounded-full bg-green-50">承認済み</span>
              </div>
              <div className="font-serif text-[var(--color-text-primary)] text-base">
                冬の朝 / 白い息吐き / 歩み出す
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-text-muted)]">カテゴリ: 季節</span>
                <span className="text-xs text-[var(--color-text-muted)]">提出: 2024/12/10</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="card space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-sakura-pale)] text-[var(--color-sakura)] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">詳細なインサイト</h3>
            <p className="text-[var(--color-text-secondary)]">
              配信したお題の表示回数、投稿数、エンゲージメント率を確認できます。
              リアルタイムで集計されたデータをもとに、ユーザーの反応を分析し、次のキャンペーン企画に活かせます。
            </p>
            <div className="bg-[var(--color-washi)] rounded-xl p-4 border border-[var(--color-border)]">
              <div className="flex items-end gap-2 justify-center">
                <div className="h-16 w-8 bg-[var(--color-igusa-pale)] rounded-t"></div>
                <div className="h-24 w-8 bg-[var(--color-igusa-light)] rounded-t"></div>
                <div className="h-20 w-8 bg-[var(--color-igusa-pale)] rounded-t"></div>
                <div className="h-32 w-8 bg-[var(--color-igusa)] rounded-t"></div>
                <div className="h-28 w-8 bg-[var(--color-igusa-light)] rounded-t"></div>
              </div>
            </div>
          </div>
        </section>

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

            {profile && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                <p>
                  すでにスポンサー登録済みです。状況: <span className="font-bold">{profile.verified ? '承認済み' : '審査中'}</span>
                </p>
                <p className="mt-1">
                  <Link href="/sponsor" className="underline font-semibold hover:text-emerald-900">ダッシュボードへ移動</Link>
                </p>
              </div>
            )}

            {!profile && !hasSession && (
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
            )}

            {!profile && hasSession && (
              <form className="space-y-6" onSubmit={handleExistingUserRegister}>
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800 text-sm">
                  ログイン済みのアカウントでスポンサー登録を行います。
                </div>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary"
                >
                  {loading ? '登録中...' : 'スポンサー登録を申し込む'}
                </button>
              </form>
            )}
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
