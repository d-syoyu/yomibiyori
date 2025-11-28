/**
 * New Sponsor Theme Submission Page
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getImpersonation } from '@/lib/impersonation'
import { useToast } from '@/lib/hooks/useToast'
import ThemeCalendar from '@/components/ThemeCalendar'
import VerticalText from '@/components/VerticalText'

const CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア']

// カテゴリ別カラー（モバイルアプリと同じ）
const CATEGORY_COLORS: Record<string, { gradient: [string, string]; shadow: string }> = {
  恋愛: {
    gradient: ['#FFB7C5', '#FFE4E8'], // 桜色
    shadow: 'rgba(255, 183, 197, 0.3)',
  },
  季節: {
    gradient: ['#88B04B', '#A8C98B'], // 抹茶/若葉色
    shadow: 'rgba(136, 176, 75, 0.3)',
  },
  日常: {
    gradient: ['#A7D8DE', '#D4ECF0'], // 空色
    shadow: 'rgba(167, 216, 222, 0.3)',
  },
  ユーモア: {
    gradient: ['#F0E68C', '#FFF9C4'], // 金色
    shadow: 'rgba(240, 230, 140, 0.3)',
  },
}

export default function NewThemePage() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [credits, setCredits] = useState<number>(0)
  const [companyName, setCompanyName] = useState<string>('')
  const [formData, setFormData] = useState({
    date: '',
    category: '恋愛',
    line1: '', // 5文字
    line2: '', // 7文字
    line3: '', // 5文字
    sponsor_official_url: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureCampaign()
  }, [])

  async function ensureCampaign() {
    try {
      // Check for impersonation first
      const impersonation = getImpersonation()
      const { data: { session } } = await supabase.auth.getSession()

      // Determine sponsor ID - use impersonation if available, otherwise session
      let sponsorId: string
      if (impersonation) {
        sponsorId = impersonation.sponsorId
      } else if (session) {
        sponsorId = session.user.id
      } else {
        return
      }

      // Check if sponsor record exists and get credits
      let { data: sponsor } = await supabase
        .from('sponsors')
        .select('id, credits, company_name')
        .eq('id', sponsorId)
        .single()

      // Set credits and company name if sponsor exists
      if (sponsor) {
        setCredits(sponsor.credits || 0)
        setCompanyName(sponsor.company_name || '')
      }

      // Create sponsor record if not exists (only for non-impersonation)
      if (!sponsor) {
        if (impersonation) {
          // Impersonation but sponsor not found - this shouldn't happen
          setError('スポンサー情報が見つかりません')
          return
        }
        if (!session) {
          setError('ログインしてください')
          return
        }
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
        setCompanyName(newSponsor.company_name || '')
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

    // Combine lines with newlines for proper display
    const text_575 = `${formData.line1}\n${formData.line2}\n${formData.line3}`

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
          sponsor_official_url: formData.sponsor_official_url?.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'お題の投稿に失敗しました')
      }

      toast.success('お題を投稿しました。審査をお待ちください。')
      router.push('/sponsor/themes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お題の投稿に失敗しました')
      setLoading(false)
    }
  }

  // Get min date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  const minDate = `${year}-${month}-${day}`

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
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-amber-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
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

          {/* Sponsor Link */}
          <div>
            <label
              htmlFor="sponsor_official_url"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              スポンサー公式URL
            </label>
            <input
              id="sponsor_official_url"
              type="url"
              value={formData.sponsor_official_url}
              onChange={(e) => setFormData({ ...formData, sponsor_official_url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
            />
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              スポンサー名をタップすると開くリンクです。イベントやキャンペーンURLも入力いただけます。
            </p>
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

            {/* Preview - モバイルアプリと同様の表示 */}
            {(formData.line1 || formData.line2 || formData.line3) && (
              <div className="mt-4">
                <p className="text-xs text-[var(--color-text-muted)] mb-3">プレビュー（モバイルアプリでの表示イメージ）:</p>
                <div
                  className="relative overflow-hidden rounded-xl p-6 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${CATEGORY_COLORS[formData.category]?.gradient[0] || '#E8D4C4'}, ${CATEGORY_COLORS[formData.category]?.gradient[1] || '#D4C4B4'})`,
                    boxShadow: `0 10px 25px -5px ${CATEGORY_COLORS[formData.category]?.shadow || 'rgba(0, 0, 0, 0.1)'}`,
                  }}
                >
                  {/* Glass overlay */}
                  <div className="bg-white/20 rounded-lg p-4">
                    {/* スポンサーバッジ */}
                    <div className="mb-3">
                      <span className="inline-block bg-white/90 text-xs font-semibold text-[var(--color-text-primary)] px-2 py-1 rounded shadow-sm">
                        スポンサー提供
                      </span>
                    </div>

                    {/* お題ラベル */}
                    <p className="text-xs text-[var(--color-text-secondary)] text-center mb-3 tracking-wider">
                      今日のお題（上の句）
                    </p>

                    {/* 縦書きお題 */}
                    <div className="flex justify-center py-4">
                      <VerticalText
                        text={`${formData.line1 || '＿＿＿'}\n${formData.line2 || '＿＿＿＿＿'}\n${formData.line3 || '＿＿＿'}`}
                        charClassName="text-xl font-serif font-bold text-[var(--color-text-primary)]"
                      />
                    </div>

                    {/* カテゴリ */}
                    <p className="text-sm text-[var(--color-text-secondary)] text-center mt-2 tracking-widest">
                      {formData.category}
                    </p>

                    {/* スポンサーリンク（ボタン形式） */}
                    <div className="flex justify-center mt-3">
                      <a
                        href={formData.sponsor_official_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
                          formData.sponsor_official_url
                            ? 'bg-white border-2 border-[var(--color-text-primary)] text-[var(--color-text-primary)] hover:bg-gray-50 hover:shadow-md'
                            : 'bg-gray-100 border-2 border-gray-300 text-[var(--color-text-secondary)] cursor-default'
                        }`}
                        onClick={(e) => !formData.sponsor_official_url && e.preventDefault()}
                      >
                        <span>{companyName || 'スポンサー名'}</span>
                        {/* シェアアイコン（URLがある場合のみ） */}
                        {formData.sponsor_official_url && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                          </svg>
                        )}
                      </a>
                    </div>
                  </div>
                </div>
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
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-igusa)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg> 投稿のヒント
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
