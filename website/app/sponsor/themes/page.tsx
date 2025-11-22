/**
 * Sponsor Themes List Page
 */

'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
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

function SponsorThemesContent() {
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
        return 'bg-yellow-50 text-yellow-800 border border-yellow-200'
      case 'approved':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
      case 'published':
        return 'bg-[var(--color-washi)] text-[var(--color-igusa)] border border-[var(--color-igusa-light)]'
      case 'rejected':
        return 'bg-red-50 text-red-800 border border-red-200'
      default:
        return 'bg-gray-50 text-gray-800 border border-gray-200'
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
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="section-heading text-3xl mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              お題管理
            </span>
          </h1>
          <p className="section-subheading">
            投稿したお題の一覧と審査状況を確認できます
          </p>
        </div>
        <a
          href="/sponsor/themes/new"
          className="btn-primary"
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isActive
                  ? 'bg-[var(--color-igusa)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-washi)] border border-[var(--color-border)]'
                }`}
            >
              {filter.label}
            </a>
          )
        })}
      </div>

      {themes.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[var(--color-text-secondary)] text-lg mb-6">
            {status
              ? `${statusFilters.find((f) => f.value === status)?.label}のお題はありません`
              : 'お題がありません'}
          </p>
          <a
            href="/sponsor/themes/new"
            className="btn-primary inline-block"
          >
            最初のお題を投稿する
          </a>
        </div>
      ) : (
        <div className="grid gap-6">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="card"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-washi)] text-[var(--color-igusa)] border border-[var(--color-border)] mb-2">
                    {theme.category}
                  </span>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    配信予定日: {new Date(theme.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(theme.status)}`}
                >
                  {getStatusLabel(theme.status)}
                </span>
              </div>

              <div className="mb-4 bg-[var(--color-washi)] rounded-xl p-8 border border-[var(--color-border)]">
                <p className="text-2xl font-serif font-bold text-[var(--color-text-primary)] text-center">
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

              <div className="flex justify-between items-center text-sm text-[var(--color-text-muted)]">
                <span>投稿日時: {new Date(theme.created_at).toLocaleString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SponsorThemesPage() {
  return (
    <Suspense fallback={<div className="text-[var(--color-text-secondary)]">読み込み中...</div>}>
      <SponsorThemesContent />
    </Suspense>
  )
}
