/**
 * Theme Review Page
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface SponsorTheme {
  id: string
  campaign_id: string
  date: string
  category: string
  text_575: string
  status: 'pending' | 'approved' | 'rejected'
  rejected_reason?: string
  created_at: string
}

export default function ThemesPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')

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
        alert('セッションが切れました。再ログインしてください。')
        return
      }

      const { error } = await supabase
        .from('sponsor_themes')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: session.user.id,
        })
        .eq('id', themeId)

      if (error) {
        // RLS policy violation
        if (error.code === 'PGRST301' || error.code === '42501') {
          alert('管理者権限が必要です')
        } else {
          alert(`承認に失敗しました: ${error.message}`)
        }
        setProcessingId(null)
        return
      }

      // 即座にリストから削除
      setThemes(prevThemes => prevThemes.filter(t => t.id !== themeId))

      alert('お題を承認しました')
    } catch (error) {
      console.error('Failed to approve theme:', error)
      alert('予期しないエラーが発生しました')
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
        alert('セッションが切れました。再ログインしてください。')
        return
      }

      const { error } = await supabase
        .from('sponsor_themes')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', themeId)

      if (error) {
        // RLS policy violation
        if (error.code === 'PGRST301' || error.code === '42501') {
          alert('管理者権限が必要です')
        } else {
          alert(`却下に失敗しました: ${error.message}`)
        }
        setProcessingId(null)
        return
      }

      // 即座にリストから削除
      setThemes(prevThemes => prevThemes.filter(t => t.id !== themeId))

      alert('お題を却下しました')
    } catch (error) {
      console.error('Failed to reject theme:', error)
      alert('予期しないエラーが発生しました')
    } finally {
      setProcessingId(null)
    }
  }

  const statusFilters = [
    { label: '全て', value: null },
    { label: '審査待ち', value: 'pending' },
    { label: '承認済み', value: 'approved' },
    { label: '却下', value: 'rejected' },
  ]

  if (loading) {
    return <div className="text-amber-900">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-900 mb-2">
            スポンサーお題審査
          </h1>
          <p className="text-amber-700">
            提出されたお題の審査を行います
          </p>
        </div>
      </div>

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
                  ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-md'
                  : 'bg-white/80 text-amber-700 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              {filter.label}
            </a>
          )
        })}
      </div>

      {themes.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-amber-100 text-center">
          <p className="text-amber-700 text-lg">
            {status
              ? `${statusFilters.find((f) => f.value === status)?.label}のお題はありません`
              : 'お題がありません'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-900 mb-2">
                    {theme.category}
                  </span>
                  <p className="text-sm text-amber-600">
                    {new Date(theme.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    theme.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-900'
                      : theme.status === 'approved'
                      ? 'bg-green-100 text-green-900'
                      : 'bg-red-100 text-red-900'
                  }`}
                >
                  {theme.status === 'pending'
                    ? '審査待ち'
                    : theme.status === 'approved'
                    ? '承認済み'
                    : '却下'}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-amber-900 text-center py-8">
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
