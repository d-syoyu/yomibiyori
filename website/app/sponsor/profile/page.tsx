/**
 * Sponsor Profile Settings Page
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  SponsorProfile,
  fetchSponsorProfile,
  updateSponsorProfile,
} from '@/lib/sponsorApi'

export default function SponsorProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<SponsorProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchSponsorProfile()
      setProfile(data)
      setCompanyName(data.company_name)
      setContactEmail(data.contact_email ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'プロフィール取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    try {
      setSaving(true)
      const payload = {
        company_name: companyName.trim(),
        contact_email: contactEmail.trim() || null,
      }
      const updated = await updateSponsorProfile(payload)
      setProfile(updated)
      setSuccessMessage('プロフィールを更新しました')
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <div className="card text-center py-12">
          <p className="text-[var(--color-text-muted)] mb-4">
            スポンサープロフィールが見つかりませんでした
          </p>
          <button
            onClick={() => router.push('/sponsor')}
            className="btn-primary"
          >
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="section-heading text-3xl mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
            プロフィール設定
          </span>
        </h1>
        <p className="section-subheading">
          配信されるお題に表示される企業情報を管理できます
        </p>
      </header>

      <section className="card">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
            {successMessage}
          </div>
        )}

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
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              配信されるお題に表示される企業名です
            </p>
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

          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="grid md:grid-cols-2 gap-3 text-xs text-[var(--color-text-muted)]">
              <div>
                <span className="font-medium">承認ステータス:</span>{' '}
                {profile.verified ? (
                  <span className="text-emerald-600 font-semibold">承認済み</span>
                ) : (
                  <span className="text-orange-600 font-semibold">審査中</span>
                )}
              </div>
              <div>
                <span className="font-medium">登録日:</span>{' '}
                {new Date(profile.created_at).toLocaleDateString('ja-JP')}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/sponsor')}
              className="flex-1 rounded-xl border border-[var(--color-border)] px-6 py-3 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-washi)] transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary"
            >
              {saving ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
