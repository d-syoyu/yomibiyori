/**
 * Theme Review Page
 */

'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/lib/hooks/useToast'

type ThemeStatus = 'pending' | 'approved' | 'rejected' | 'published'

interface SponsorTheme {
  id: string
  campaign_id: string
  date: string
  category: string
  text_575: string
  status: ThemeStatus
  rejected_reason?: string
  created_at: string
}

// ステータス表示の設定（一箇所で管理してバグを防止）
const STATUS_CONFIG: Record<ThemeStatus, { label: string; className: string }> = {
  pending: {
    label: '審査待ち',
    className: 'bg-yellow-100 text-yellow-900',
  },
  approved: {
    label: '承認済み',
    className: 'bg-green-100 text-green-900',
  },
  rejected: {
    label: '却下',
    className: 'bg-red-100 text-red-900',
  },
  published: {
    label: '配信済み',
    className: 'bg-blue-100 text-blue-900',
  },
}

function ThemesContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const toast = useToast()

  const [themes, setThemes] = useState<SponsorTheme[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadThemes = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('sponsor_themes')
        .select('*')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      setThemes(data || [])
    } catch (error) {
      console.error('Failed to load themes:', error)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadThemes()
  }, [loadThemes, refreshKey])

  async function handleApprove(themeId: string) {
    if (processingId) return

    setProcessingId(themeId)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('セッションが切れました。再ログインしてください。')
        return
      }

      // Use FastAPI endpoint to approve theme
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://yomibiyori-production.up.railway.app'}/api/v1/admin/review/themes/${themeId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        if (response.status === 403) {
          toast.error('管理者権限が必要です')
        } else {
          toast.error(`承認に失敗しました: ${errorData.detail || response.statusText}`)
        }
        setProcessingId(null)
        return
      }

      // 即座にリストから削除
      setThemes(prevThemes => prevThemes.filter(t => t.id !== themeId))

      toast.success('お題を承認しました')
    } catch (error) {
      console.error('Failed to approve theme:', error)
      toast.error('予期しないエラーが発生しました')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(themeId: string) {
    if (processingId) return

    const reason = prompt('却下理由を入力してください')
    if (!reason) return

    setProcessingId(themeId)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('セッションが切れました。再ログインしてください。')
        return
      }

      // Use FastAPI endpoint to reject theme
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://yomibiyori-production.up.railway.app'}/api/v1/admin/review/themes/${themeId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ rejection_reason: reason }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        if (response.status === 403) {
          toast.error('管理者権限が必要です')
        } else {
          toast.error(`却下に失敗しました: ${errorData.detail || response.statusText}`)
        }
        setProcessingId(null)
        return
      }

      // 即座にリストから削除
      setThemes(prevThemes => prevThemes.filter(t => t.id !== themeId))

      toast.success('お題を却下しました（クレジットは返金されました）')
    } catch (error) {
      console.error('Failed to reject theme:', error)
      toast.error('予期しないエラーが発生しました')
    } finally {
      setProcessingId(null)
    }
  }

  const statusFilters = [
    { label: '全て', value: null },
    { label: '審査待ち', value: 'pending' },
    { label: '承認済み', value: 'approved' },
    { label: '配信済み', value: 'published' },
    { label: '却下', value: 'rejected' },
  ]

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
          お題審査
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
            スポンサーお題審査
          </span>
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          提出されたお題の審査を行います
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((filter) => {
          const isActive = filter.value === status
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/admin/themes?status=${filter.value}`
                  : '/admin/themes'
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--color-igusa)] text-white shadow-md'
                  : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-washi)] border border-[var(--color-border)]'
              }`}
            >
              {filter.label}
            </a>
          )
        })}
      </div>

      {themes.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-[var(--color-text-secondary)] text-lg">
            {status
              ? `${statusFilters.find((f) => f.value === status)?.label}のお題はありません`
              : 'お題がありません'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {themes.map((theme) => (
            <div key={theme.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-washi)] text-[var(--color-igusa)] mb-2">
                    {theme.category}
                  </span>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {new Date(theme.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    STATUS_CONFIG[theme.status]?.className || 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {STATUS_CONFIG[theme.status]?.label || theme.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-[var(--color-text-primary)] text-center py-8 font-serif">
                  {theme.text_575}
                </p>
              </div>

              {theme.rejected_reason && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    却下理由:
                  </p>
                  <p className="text-sm text-red-800">{theme.rejected_reason}</p>
                </div>
              )}

              {theme.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(theme.id)}
                    disabled={processingId === theme.id}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50"
                  >
                    {processingId === theme.id ? '処理中...' : '承認'}
                  </button>
                  <button
                    onClick={() => handleReject(theme.id)}
                    disabled={processingId === theme.id}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-lg hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50"
                  >
                    {processingId === theme.id ? '処理中...' : '却下'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ThemesPage() {
  return (
    <Suspense fallback={<div className="text-[var(--color-text-secondary)]">読み込み中...</div>}>
      <ThemesContent />
    </Suspense>
  )
}