/**
 * New Sponsor Theme Submission Page
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ThemeCalendar from '@/components/ThemeCalendar'

const CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア']

export default function NewThemePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [credits, setCredits] = useState<number>(0)
  const [formData, setFormData] = useState({
    date: '',
    category: '恋愛',
    line1: '', // 5文字
    line2: '', // 7文字
    line3: '', // 5文字
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureCampaign()
  }, [])

  async function ensureCampaign() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Check if sponsor record exists and get credits
      let { data: sponsor } = await supabase
        .from('sponsors')
        .select('id, credits')
        .eq('id', session.user.id)
        .single()

      // Set credits if sponsor exists
      if (sponsor) {
        setCredits(sponsor.credits || 0)
      }

      // Create sponsor record if not exists
      if (!sponsor) {
        const { data: newSponsor, error: sponsorError } = await supabase
          .from('sponsors')
          .insert({
            id: session.user.id,
            company_name: session.user.email || 'スポンサー企業',
            contact_email: session.user.email,
            text: 'デフォルトテキスト', // 旧フィールド（後方互換性のため）3文字以上必要
            category: '一般', // デフォルトカテゴリ
            target_regions: [], // 空配列（デフォルト値）
            plan_tier: 'basic', // 料金プラン（basic/standard/premium）
            verified: false, // KYC未承認
          })
          .select()
          .single()

        if (sponsorError || !newSponsor) {
          console.error('Failed to create sponsor:', sponsorError)
          setError('スポンサー情報の作成に失敗しました')
          return
        }
        sponsor = newSponsor
      }

      // At this point, sponsor cannot be null
      if (!sponsor) {
        setError('スポンサー情報が取得できませんでした')
        return
      }

      // Get or create default campaign
      let { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .eq('sponsor_id', sponsor.id)
        .eq('status', 'active')
        .limit(1)

      if (campaigns && campaigns.length > 0) {
        setCampaignId(campaigns[0].id)
      } else {
        // Create default campaign
        const { data: newCampaign, error: campaignError } = await supabase
          .from('sponsor_campaigns')
          .insert({
            sponsor_id: sponsor.id,
            name: 'デフォルトキャンペーン',
            status: 'active',
          })
          .select()
          .single()

        if (campaignError || !newCampaign) {
          console.error('Failed to create campaign:', campaignError)
          setError('キャンペーンの作成に失敗しました')
          return
        }

        setCampaignId(newCampaign.id)
      }
    } catch (error) {
      console.error('Failed to ensure campaign:', error)
      setError('初期化に失敗しました')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!campaignId) {
      setError('キャンペーンが見つかりません')
      return
    }

    // Validate each line
    if (!formData.line1.trim() || !formData.line2.trim() || !formData.line3.trim()) {
      setError('すべての句を入力してください')
      return
    }

    // Combine lines
    const text_575 = `${formData.line1} ${formData.line2} ${formData.line3}`

    // Validate combined length
    if (text_575.length > 140) {
      setError('お題が長すぎます。140文字以内にしてください。')
      return
    }

    // Validate date is in the future
    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      setError('配信日は今日以降の日付を選択してください')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('ログインしてください')
      }

      // Use backend API to submit theme (handles credit deduction)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/themes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          date: formData.date,
          category: formData.category,
          text_575: text_575,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'お題の投稿に失敗しました')
      }

      alert('お題を投稿しました。審査をお待ちください。')
      router.push('/sponsor/themes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お題の投稿に失敗しました')
      setLoading(false)
    }
  }

  // Get min date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="section-heading text-3xl mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
            新規お題投稿
          </span>
        </h1>
        <p className="section-subheading">
          配信したいお題を投稿してください。審査後、承認されると配信されます。
        </p>
      </div>

      {/* Credit Balance Warning */}
      {credits < 1 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 mb-1">クレジットが不足しています</h3>
              <p className="text-sm text-amber-800 mb-3">
                お題を投稿するには1クレジットが必要です。クレジットを購入してください。
              </p>
              <a
                href="/sponsor/credits"
                className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors"
              >
                クレジットを購入
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Credit Balance Display */}
      <div className="card bg-gradient-to-r from-[var(--color-igusa)]/10 to-[var(--color-igusa-light)]/10 border-[var(--color-igusa)]/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">利用可能クレジット</p>
            <p className="text-3xl font-bold font-serif text-[var(--color-igusa)]">{credits}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">お題投稿に必要</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">1 クレジット</p>
          </div>
        </div>
      </div>

      {/* Theme Calendar */}
      <div className="card">
        <ThemeCalendar
          selectedDate={formData.date}
          selectedCategory={formData.category}
          onSlotSelect={(date, category) => setFormData({ ...formData, date, category })}
        />
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              配信予定日 <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={minDate}
              required
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
            />
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              お題が配信される日付を選択してください
            </p>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 5-7-5 Input */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              上の句（5-7-5） <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {/* 第一句（5文字） */}
              <div>
                <label htmlFor="line1" className="block text-xs text-[var(--color-text-muted)] mb-1">
                  第一句（5音）
                </label>
                <input
                  id="line1"
                  type="text"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  required
                  placeholder="例：春の風"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formData.line1.length}文字
                </p>
              </div>

              {/* 第二句（7文字） */}
              <div>
                <label htmlFor="line2" className="block text-xs text-[var(--color-text-muted)] mb-1">
                  第二句（7音）
                </label>
                <input
                  id="line2"
                  type="text"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  required
                  placeholder="例：桜舞い散る"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formData.line2.length}文字
                </p>
              </div>

              {/* 第三句（5文字） */}
              <div>
                <label htmlFor="line3" className="block text-xs text-[var(--color-text-muted)] mb-1">
                  第三句（5音）
                </label>
                <input
                  id="line3"
                  type="text"
                  value={formData.line3}
                  onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                  required
                  placeholder="例：花の道"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formData.line3.length}文字
                </p>
              </div>
            </div>

            {/* Preview */}
            {(formData.line1 || formData.line2 || formData.line3) && (
              <div className="mt-4 p-6 bg-[var(--color-washi)] rounded-xl border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-3">プレビュー:</p>
                <p className="text-xl font-serif font-bold text-[var(--color-text-primary)] text-center">
                  {formData.line1 || '＿＿＿'} {formData.line2 || '＿＿＿＿＿'} {formData.line3 || '＿＿＿'}
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 btn-secondary"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !campaignId || credits < 1}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>

      <div className="card bg-[var(--color-washi)]/50">
        <h3 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <span className="text-xl">📝</span> 投稿のヒント
        </h3>
        <ul className="text-sm text-[var(--color-text-secondary)] space-y-2">
          <li>• 上の句は3〜140文字以内で入力してください</li>
          <li>• 配信日は翌日以降の日付を選択してください</li>
          <li>• 投稿後、管理者が審査を行います</li>
          <li>• 承認されると指定日に配信されます</li>
        </ul>
      </div>
    </div>
  )
}
