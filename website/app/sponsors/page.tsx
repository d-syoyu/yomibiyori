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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-50 via-white to-amber-50">
        <p className="text-amber-900">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50">
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-24 space-y-10">
        <header className="text-center space-y-4">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-700">
            スポンサー様向け
          </span>
          <h1 className="text-4xl font-serif font-bold text-amber-900">
            お題(上の句)の提供に参加しませんか
          </h1>
          <p className="text-amber-800">
            ブランドメッセージを短歌の世界で届ける、新しいタイアップ体験。
          </p>
        </header>

        {!hasSession && (
          <section className="rounded-2xl border border-amber-200 bg-white/80 p-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold text-amber-900">まずはログイン</h2>
            <p className="text-amber-700">
              スポンサー登録・管理には専用アカウントでのログインが必要です。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sponsor-login"
                className="inline-flex items-center justify-center rounded-full bg-amber-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-amber-700"
              >
                スポンサーとしてログイン
              </Link>
              <Link
                href="/support"
                className="text-amber-800 underline-offset-4 hover:underline"
              >
                アカウント発行について問い合わせる
              </Link>
            </div>
          </section>
        )}

        {hasSession && (
          <section className="rounded-2xl border border-amber-200 bg-white/90 p-8 shadow-lg space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-amber-900">
                スポンサー登録フォーム
              </h2>
              <p className="text-amber-700 text-sm">
                企業情報を送信すると、運営が内容を審査し verified になるとお題投稿が可能になります。
              </p>
            </div>

            {profile && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
                <p>
                  すでにスポンサー登録済みです。状況: {profile.verified ? '承認済み' : '審査中'}
                </p>
                <p className="mt-1">
                  お題投稿・管理は <Link href="/sponsor" className="underline font-semibold">スポンサー専用ダッシュボード</Link> から行えます。
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
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    企業名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                    placeholder="例: 株式会社よみびより"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">
                    連絡先メールアドレス
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                    placeholder="sponsor@example.com"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-2">公式サイトURL</label>
                    <input
                      type="url"
                      value={officialUrl}
                      onChange={(e) => setOfficialUrl(e.target.value)}
                      className="w-full rounded-xl border border-amber-200 px-4 py-3 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-2">ロゴ画像URL</label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full rounded-xl border border-amber-200 px-4 py-3 focus:ring-2 focus:ring-amber-200 focus:outline-none"
                      placeholder="https://.../logo.png"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-2">プラン</label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {PLAN_TIERS.map((plan) => (
                      <label key={plan.value} className={`rounded-xl border px-4 py-3 flex items-center gap-2 cursor-pointer ${planTier === plan.value ? 'border-amber-500 bg-amber-50' : 'border-amber-200 bg-white'}`}>
                        <input
                          type="radio"
                          name="plan-tier"
                          value={plan.value}
                          checked={planTier === plan.value}
                          onChange={(e) => setPlanTier(e.target.value)}
                        />
                        <span className="text-sm font-medium text-amber-900">{plan.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-amber-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? '送信中...' : 'スポンサー登録を申し込む'}
                </button>
              </form>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-amber-100 bg-white/70 p-8 grid md:grid-cols-3 gap-6">
          {[
            { title: 'オーディエンス', body: '短歌を愛するクリエイティブ層にブランドストーリーを届けられます。' },
            { title: '掲載サイクル', body: '毎朝6時配信、当日22時にランキング確定というリズムで露出します。' },
            { title: 'サポート', body: '専任チームがコピー監修や投稿スケジュール設計を伴走します。' },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <h3 className="text-lg font-semibold text-amber-900">{item.title}</h3>
              <p className="text-sm text-amber-700">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
