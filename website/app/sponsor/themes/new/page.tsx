/**
 * New Sponsor Theme Submission Page
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア']

export default function NewThemePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: '',
    category: '恋愛',
    text_575: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureCampaign()
  }, [])

  async function ensureCampaign() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Check if sponsor record exists
      let { data: sponsor } = await supabase
        .from('sponsors')
        .select('id')
        .eq('id', session.user.id)
        .single()

      // Create sponsor record if not exists
      if (!sponsor) {
        const { data: newSponsor, error: sponsorError } = await supabase
          .from('sponsors')
          .insert({
            id: session.user.id,
            company_name: session.user.email || 'スポンサー企業',
            contact_email: session.user.email,
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

    // Validate text_575 length
    if (formData.text_575.length < 3 || formData.text_575.length > 140) {
      setError('お題は3文字以上、140文字以内で入力してください')
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
      const { error: insertError } = await supabase
        .from('sponsor_themes')
        .insert({
          campaign_id: campaignId,
          date: formData.date,
          category: formData.category,
          text_575: formData.text_575,
          status: 'pending',
        })

      if (insertError) {
        console.error('Failed to insert theme:', insertError)
        if (insertError.code === '23505') {
          throw new Error('この日付・カテゴリではすでにお題を投稿しています')
        }
        throw new Error('お題の投稿に失敗しました')
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-900 mb-2">
          新規お題投稿
        </h1>
        <p className="text-purple-700">
          配信したいお題を投稿してください。審査後、承認されると配信されます。
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-purple-100 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-purple-900 mb-2"
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
              className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            <p className="mt-1 text-sm text-purple-600">
              お題が配信される日付を選択してください
            </p>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-purple-900 mb-2"
            >
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Text 575 */}
          <div>
            <label
              htmlFor="text_575"
              className="block text-sm font-medium text-purple-900 mb-2"
            >
              上の句（5-7-5） <span className="text-red-500">*</span>
            </label>
            <textarea
              id="text_575"
              value={formData.text_575}
              onChange={(e) => setFormData({ ...formData, text_575: e.target.value })}
              required
              rows={4}
              maxLength={140}
              placeholder="例：春の風 桜舞い散る 花の道"
              className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none"
            />
            <p className="mt-1 text-sm text-purple-600">
              {formData.text_575.length} / 140文字
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-3 border border-purple-300 text-purple-700 font-medium rounded-lg hover:bg-purple-50 transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !campaignId}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📝 投稿のヒント</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 上の句は3〜140文字以内で入力してください</li>
          <li>• 配信日は翌日以降の日付を選択してください</li>
          <li>• 投稿後、管理者が審査を行います</li>
          <li>• 承認されると指定日に配信されます</li>
        </ul>
      </div>
    </div>
  )
}
