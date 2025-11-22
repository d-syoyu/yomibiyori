'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import {
  SponsorProfile,
  createSponsorProfile,
  fetchSponsorProfile,
} from '@/lib/sponsorApi'

const PLAN_TIERS = [
  { value: 'basic', label: 'Basic (お試し)' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
]

export default function SponsorsPage() {
  const supabase = useMemo(() => getSupabase(), [])
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [profile, setProfile] = useState<SponsorProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [planTier, setPlanTier] = useState('basic')

  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(Boolean(session))
      if (session?.user?.email) {
        setContactEmail(session.user.email)
      }
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
      setContactEmail(data.contact_email ?? '')
      setOfficialUrl(data.official_url ?? '')
      setLogoUrl(data.logo_url ?? '')
      setPlanTier(data.plan_tier)
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      setLoading(true)
      const payload = await createSponsorProfile({
        company_name: companyName.trim(),
        contact_email: contactEmail.trim() || undefined,
        official_url: officialUrl.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        plan_tier: planTier,
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
    <div className="page-wrapper">
      <main className="page-container space-y-24">
        {/* Hero Section */}
        <header className="text-center space-y-6 pt-12">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            企業・団体様向け
          </div>
          <h1 className="section-heading">
            ブランドの物語を、<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">短歌という器で。</span>
          </h1>
          <p className="section-subheading">
            「よみびより」は、言葉を大切にするユーザーが集まるコミュニティです。<br />
            貴社のメッセージをお題として提供し、ユーザーとの深いエンゲージメントを築きませんか。
          </p>
        </header>

        {/* Features Grid */}
        <section className="grid md:grid-cols-2 gap-12">
          {/* Topic Management */}
          <div className="card space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-washi-dark)] text-[var(--color-igusa)] flex items-center justify-center text-2xl">
              📝
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">直感的なお題管理</h3>
            <p className="text-[var(--color-text-secondary)]">
              専用ダッシュボードから、簡単にお題（上の句）を作成・配信予約できます。
              季節やキャンペーンに合わせたタイミングで、ユーザーに問いかけることができます。
            </p>
            <div className="bg-[var(--color-washi)] rounded-xl p-4 border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
              <div className="flex items-center justify-between mb-2 border-b border-[var(--color-border)] pb-2">
                <span>2024/12/01 配信予定</span>
                <span className="text-[var(--color-igusa)] font-bold">予約済み</span>
              </div>
              <div className="font-serif text-[var(--color-text-primary)] text-lg mb-1">
                冬の朝、白い息吐き...
              </div>
              <div className="text-xs text-right">作成者: マーケティング部</div>
            </div>
          </div>

          {/* Insights */}
          <div className="card space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-sakura-pale)] text-[var(--color-sakura)] flex items-center justify-center text-2xl">
              📊
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">詳細なインサイト</h3>
            <p className="text-[var(--color-text-secondary)]">
              投稿数、いいね数、リーチ数などをリアルタイムで可視化。
              どのような言葉がユーザーの心に響いたのか、定量的・定性的に分析できます。
            </p>
            <div className="bg-[var(--color-washi)] rounded-xl p-4 border border-[var(--color-border)] space-y-3">
              <div className="flex items-end gap-2">
                <div className="h-16 w-8 bg-[var(--color-igusa-pale)] rounded-t"></div>
                <div className="h-24 w-8 bg-[var(--color-igusa-light)] rounded-t"></div>
                <div className="h-20 w-8 bg-[var(--color-igusa-pale)] rounded-t"></div>
                <div className="h-32 w-8 bg-[var(--color-igusa)] rounded-t"></div>
                <div className="h-28 w-8 bg-[var(--color-igusa-light)] rounded-t"></div>
              </div>
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>投稿数推移</span>
                <span className="font-bold text-[var(--color-igusa)]">+124%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Registration Form Section */}
        <section className="max-w-2xl mx-auto">
          <div className="card space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">スポンサー登録</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                まずはアカウントを作成し、企業情報をご登録ください。
              </p>
            </div>

            {!hasSession ? (
              <div className="text-center space-y-6 py-8">
                <p className="text-[var(--color-text-secondary)]">
                  登録・管理にはログインが必要です。
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/sponsor-login"
                    className="btn-primary"
                  >
                    スポンサーログイン
                  </Link>
                  <Link
                    href="/support"
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-ai)] underline underline-offset-4"
                  >
                    お問い合わせ
                  </Link>
                </div>
              </div>
            ) : (
              <>
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

                {!profile && (
                  <form className="space-y-6" onSubmit={handleSubmit}>
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
                        連絡先メールアドレス
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                        placeholder="sponsor@example.com"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">公式サイトURL</label>
                        <input
                          type="url"
                          value={officialUrl}
                          onChange={(e) => setOfficialUrl(e.target.value)}
                          className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                          placeholder="https://example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">ロゴ画像URL</label>
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 focus:ring-2 focus:ring-[var(--color-ai)] focus:outline-none bg-white"
                          placeholder="https://.../logo.png"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">プラン</label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {PLAN_TIERS.map((plan) => (
                          <label key={plan.value} className={`rounded-xl border px-4 py-3 flex items-center gap-2 cursor-pointer transition-colors ${planTier === plan.value ? 'border-[var(--color-ai)] bg-indigo-50' : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-washi)]'}`}>
                            <input
                              type="radio"
                              name="plan-tier"
                              value={plan.value}
                              checked={planTier === plan.value}
                              onChange={(e) => setPlanTier(e.target.value)}
                              className="text-[var(--color-ai)] focus:ring-[var(--color-ai)]"
                            />
                            <span className="text-sm font-medium text-[var(--color-text-primary)]">{plan.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full btn-primary"
                    >
                      {loading ? '送信中...' : 'スポンサー登録を申し込む'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </section>

        <footer className="py-12 border-t border-[var(--color-border)] bg-white/30">
          <div className="page-container text-center space-y-8">
            <div className="text-2xl font-bold text-[var(--color-igusa)]">よみびより</div>
            <nav className="flex flex-wrap justify-center gap-8 text-sm text-[var(--color-text-secondary)]">
              <Link href="/" className="hover:text-[var(--color-ai)] transition-colors">トップページ</Link>
              <Link href="/privacy" className="hover:text-[var(--color-ai)] transition-colors">プライバシーポリシー</Link>
              <Link href="/terms" className="hover:text-[var(--color-ai)] transition-colors">利用規約</Link>
              <Link href="/support" className="hover:text-[var(--color-ai)] transition-colors">サポート</Link>
            </nav>
            <p className="text-xs text-[var(--color-text-muted)]">© 2024 Yomibiyori. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
