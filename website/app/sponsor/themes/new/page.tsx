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
      const { error: insertError } = await supabase
        .from('sponsor_themes')
        .insert({
          campaign_id: campaignId,
          date: formData.date,
          category: formData.category,
          text_575: text_575,
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
              className="block text-sm font-medium text-gray-800 mb-2"
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
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
            />
            <p className="mt-1 text-sm text-gray-600">
              お題が配信される日付を選択してください
            </p>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-800 mb-2"
            >
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
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
            <label className="block text-sm font-medium text-gray-800 mb-2">
              上の句（5-7-5） <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {/* 第一句（5文字） */}
              <div>
                <label htmlFor="line1" className="block text-xs text-gray-600 mb-1">
                  第一句（5音）
                </label>
                <input
                  id="line1"
                  type="text"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  required
                  placeholder="例：春の風"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.line1.length}文字
                </p>
              </div>

              {/* 第二句（7文字） */}
              <div>
                <label htmlFor="line2" className="block text-xs text-gray-600 mb-1">
                  第二句（7音）
                </label>
                <input
                  id="line2"
                  type="text"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  required
                  placeholder="例：桜舞い散る"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.line2.length}文字
                </p>
              </div>

              {/* 第三句（5文字） */}
              <div>
                <label htmlFor="line3" className="block text-xs text-gray-600 mb-1">
                  第三句（5音）
                </label>
                <input
                  id="line3"
                  type="text"
                  value={formData.line3}
                  onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                  required
                  placeholder="例：花の道"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.line3.length}文字
                </p>
              </div>
            </div>

            {/* Preview */}
            {(formData.line1 || formData.line2 || formData.line3) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="text-xs text-gray-600 mb-2">プレビュー:</p>
                <p className="text-lg font-medium text-gray-900 text-center">
                  {formData.line1 || '＿＿＿'} {formData.line2 || '＿＿＿＿＿'} {formData.line3 || '＿＿＿'}
                </p>
              </div>
            )}
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
