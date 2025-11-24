/**
 * スポンサーお題投稿ページ（背景アップロード・クロップ対応）
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ThemeCalendar from '@/components/ThemeCalendar'
import 'react-easy-crop/react-easy-crop.css'

type CropArea = { x: number; y: number; width: number; height: number }

const CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア']
const ASPECTS = [
  { label: '9:16（アプリ/共有カード統一）', value: 9 / 16 },
]

async function getCroppedBlob(imageSrc: string, cropPixels: CropArea): Promise<Blob> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageSrc
  await new Promise(resolve => {
    if (img.complete) return resolve(null)
    img.onload = resolve
    img.onerror = resolve
  })

  const canvas = document.createElement('canvas')
  canvas.width = cropPixels.width
  canvas.height = cropPixels.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  ctx.drawImage(
    img,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('Blob creation failed'))
      resolve(blob)
    }, 'image/jpeg', 0.9)
  })
}

export default function NewThemePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [credits, setCredits] = useState<number>(0)
  const [formData, setFormData] = useState({
    date: '',
    category: '恋愛',
    line1: '',
    line2: '',
    line3: '',
  })
  const [error, setError] = useState<string | null>(null)

  // 背景画像
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(4 / 5)

  useEffect(() => {
    ensureCampaign()
  }, [])

  async function ensureCampaign() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let { data: sponsor } = await supabase
        .from('sponsors')
        .select('id, credits')
        .eq('id', session.user.id)
        .single()

      if (sponsor) {
        setCredits(sponsor.credits || 0)
      }

      if (!sponsor) {
        const { data: newSponsor, error: sponsorError } = await supabase
          .from('sponsors')
          .insert({
            id: session.user.id,
            company_name: session.user.email || 'スポンサー',
            contact_email: session.user.email,
            text: 'デフォルトテキスト',
            category: '一般',
            target_regions: [],
            plan_tier: 'basic',
            verified: false,
          })
          .select()
          .single()

        if (sponsorError || !newSponsor) {
          console.error('Failed to create sponsor:', sponsorError)
          setError('スポンサーの作成に失敗しました')
          return
        }
        sponsor = newSponsor
        setCredits(sponsor.credits || 0)
      }

      if (!sponsor) {
        setError('スポンサー情報を取得できませんでした')
        return
      }

      let { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .eq('sponsor_id', sponsor.id)
        .eq('status', 'active')
        .limit(1)

      if (campaigns && campaigns.length > 0) {
        setCampaignId(campaigns[0].id)
      } else {
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
      setError('通信エラーが発生しました')
    }
  }

  const onCropComplete = useCallback((_c: CropArea, pixels: CropArea) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleBackgroundUpload() {
    if (!imageSrc || !croppedAreaPixels) {
      setError('背景画像を選択・クロップしてください')
      return
    }
    try {
      setUploadingBg(true)
      setError(null)
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      const filename = `sponsor-bg-${Date.now()}.jpg`
      const contentType = blob.type || 'image/jpeg'

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('ログインしてください')
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
      const presignRes = await fetch(`${apiBase}/sponsor/backgrounds/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          filename,
          content_type: contentType,
        }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}))
        throw new Error(err.detail || 'アップロードURLの取得に失敗しました')
      }
      const { upload_url, public_url } = await presignRes.json()

      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      })
      if (!putRes.ok) {
        throw new Error('アップロードに失敗しました')
      }

      setBackgroundUrl(public_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '背景画像のアップロードに失敗しました')
    } finally {
      setUploadingBg(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!campaignId) {
      setError('キャンペーンが取得できていません')
      return
    }

    if (!formData.line1.trim() || !formData.line2.trim() || !formData.line3.trim()) {
      setError('すべての行を入力してください')
      return
    }

    const text_575 = `${formData.line1}\n${formData.line2}\n${formData.line3}`

    if (text_575.length > 140) {
      setError('文字数が多すぎます。140文字以内にしてください。')
      return
    }

    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      setError('投稿は明日以降の日付を選択してください')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('ログインしてください')
      }

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
          background_image_url: backgroundUrl ?? undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'お題の投稿に失敗しました')
      }

      alert('お題を投稿しました。審査をお待ちください。')
      router.push('/sponsor/themes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'お題の投稿に失敗しました')
      setLoading(false)
    }
  }

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
            新規お題
          </span>
        </h1>
        <p className="section-subheading">
          配信したいお題を投稿してください。審査後、承認されると配信されます。
        </p>
      </div>

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

      <div className="card bg-gradient-to-r from-[var(--color-igusa)]/10 to-[var(--color-igusa-light)]/10 border-[var(--color-igusa)]/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-1">残りクレジット</p>
            <p className="text-3xl font-bold font-serif text-[var(--color-igusa)]">{credits}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">お題投稿に必要</p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">1 クレジット</p>
          </div>
        </div>
      </div>

      <div className="card">
        <ThemeCalendar
          selectedDate={formData.date}
          selectedCategory={formData.category}
          onSlotSelect={(date, category) => setFormData({ ...formData, date, category })}
        />
      </div>

      {/* 背景アップロード */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[var(--color-text-primary)]">背景画像（任意）</h3>
            <p className="text-sm text-[var(--color-text-muted)]">9:16 で統一します（アプリ内表示と共有カードを合わせるため）。</p>
          </div>
          <div className="flex gap-2">
            {ASPECTS.map(opt => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setAspect(opt.value)}
                className={`px-3 py-2 rounded-lg border ${aspect === opt.value ? 'border-[var(--color-igusa)] text-[var(--color-igusa)]' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              setImageSrc(reader.result as string)
              setBackgroundUrl(null)
            }
            reader.readAsDataURL(file)
          }}
        />

        {imageSrc && (
          <div className="relative w-full h-[420px] bg-gray-100 rounded-xl overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="horizontal-cover"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={uploadingBg || !imageSrc}
            onClick={handleBackgroundUpload}
            className="btn-primary disabled:opacity-50"
          >
            {uploadingBg ? 'アップロード中...' : '背景をアップロード'}
          </button>
          {backgroundUrl && (
            <span className="text-sm text-emerald-700">アップロード済み</span>
          )}
        </div>

        {(backgroundUrl || imageSrc) && (
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-washi)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-2">プレビュー</p>
            <div
              className="h-64 rounded-lg bg-center bg-cover flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundImage: `url(${backgroundUrl || imageSrc})` }}
            >
              {formData.line1 || formData.line2 || formData.line3 ? (
                <div className="bg-black/40 p-3 rounded-lg space-y-1 text-center">
                  <div>{formData.line1 || 'ーーー'}</div>
                  <div>{formData.line2 || 'ーーーーー'}</div>
                  <div>{formData.line3 || 'ーーー'}</div>
                </div>
              ) : (
                <span className="bg-black/40 px-3 py-2 rounded-lg">お題プレビュー</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              配信日 <span className="text-red-500">*</span>
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
              明日以降の日付を選択してください
            </p>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
            >
              カテゴリー <span className="text-red-500">*</span>
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

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              上の句（5-7-5） <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <div>
                <label htmlFor="line1" className="block text-xs text-[var(--color-text-muted)] mb-1">
                  一行目（5文字）
                </label>
                <input
                  id="line1"
                  type="text"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  required
                  placeholder="例: 春待つ夜"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formData.line1.length}文字
                </p>
              </div>

              <div>
                <label htmlFor="line2" className="block text-xs text-[var(--color-text-muted)] mb-1">
                  二行目（7文字）
                </label>
                <input
                  id="line2"
                  type="text"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  required
                  placeholder="例: 風をほどく"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formData.line2.length}文字
                </p>
              </div>

              <div>
                <label htmlFor="line3" className="block text-xs text-[var(--color-text-muted)] mb-1">
                  三行目（5文字）
                </label>
                <input
                  id="line3"
                  type="text"
                  value={formData.line3}
                  onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                  required
                  placeholder="例: 朝の光"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--color-igusa)] focus:border-[var(--color-igusa)] outline-none transition-all"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {formData.line3.length}文字
                </p>
              </div>
            </div>

            {(formData.line1 || formData.line2 || formData.line3) && (
              <div className="mt-4 p-6 bg-[var(--color-washi)] rounded-xl border border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-3">プレビュー:</p>
                <div className="text-xl font-serif font-bold text-[var(--color-text-primary)] text-center space-y-1">
                  <p>{formData.line1 || 'ーーー'}</p>
                  <p>{formData.line2 || 'ーーーーー'}</p>
                  <p>{formData.line3 || 'ーーー'}</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

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
              {loading ? '送信中...' : '投稿する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
