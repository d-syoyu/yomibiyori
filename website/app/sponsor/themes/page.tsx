/**
 * Sponsor Themes List Page
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
  status: 'pending' | 'approved' | 'rejected' | 'published'
  rejection_reason?: string
  created_at: string
}

export default function SponsorThemesPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')

  const [themes, setThemes] = useState<SponsorTheme[]>([])
  const [loading, setLoading] = useState(true)

  const loadThemes = useCallback(async () => {
    try {
      setLoading(true)

      // Get current user's campaigns
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .eq('sponsor_id', session.user.id)

      if (!campaigns || campaigns.length === 0) {
        setThemes([])
        return
      }

      const campaignIds = campaigns.map(c => c.id)

      let query = supabase
        .from('sponsor_themes')
        .select('*')
        .in('campaign_id', campaignIds)
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
  }, [loadThemes])

  const statusFilters = [
    { label: '全て', value: null },
    { label: '審査待ち', value: 'pending' },
    { label: '承認済み', value: 'approved' },
    { label: '配信済み', value: 'published' },
    { label: '却下', value: 'rejected' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-900'
      case 'approved':
        return 'bg-green-100 text-green-900'
      case 'published':
        return 'bg-blue-100 text-blue-900'
      case 'rejected':
        return 'bg-red-100 text-red-900'
      default:
        return 'bg-gray-100 text-gray-900'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '審査待ち'
      case 'approved':
        return '承認済み'
      case 'published':
        return '配信済み'
      case 'rejected':
        return '却下'
      default:
        return status
    }
  }

  if (loading) {
    return <div className="text-purple-900">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 mb-2">
            お題管理
          </h1>
          <p className="text-purple-700">
            投稿したお題の一覧と審査状況を確認できます
          </p>
        </div>
        <a
          href="/sponsor/themes/new"
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
        >
          新規投稿
        </a>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((filter) => {
          const isActive = filter.value === status
          return (
            <a
              key={filter.label}
              href={
                filter.value
                  ? `/sponsor/themes?status=${filter.value}`
                  : '/sponsor/themes'
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md'
                  : 'bg-white/80 text-purple-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              {filter.label}
            </a>
          )
        })}
      </div>

      {themes.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-purple-100 text-center">
          <p className="text-purple-700 text-lg mb-4">
            {status
              ? `${statusFilters.find((f) => f.value === status)?.label}のお題はありません`
              : 'お題がありません'}
          </p>
          <a
            href="/sponsor/themes/new"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all"
          >
            最初のお題を投稿する
          </a>
        </div>
      ) : (
        <div className="grid gap-6">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-900 mb-2">
                    {theme.category}
                  </span>
                  <p className="text-sm text-purple-600">
                    配信予定日: {new Date(theme.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(theme.status)}`}
                >
                  {getStatusLabel(theme.status)}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-2xl font-bold text-purple-900 text-center py-8">
                  {theme.text_575}
                </p>
              </div>

              {theme.rejection_reason && (
                <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    却下理由:
                  </p>
                  <p className="text-sm text-red-800">{theme.rejection_reason}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-purple-600">
                <span>投稿日時: {new Date(theme.created_at).toLocaleString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
