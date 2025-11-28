/**
 * Sponsor Themes List Page
 */

'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSponsorAuth } from '@/lib/hooks/useSponsorAuth'
import {
  THEME_STATUS_FILTERS,
  getThemeStatusLabel,
  getThemeStatusClassName,
} from '@/lib/constants'
import type { SponsorTheme, ThemeStatus } from '@/types/sponsor'
import { Loading } from '@/components/ui/Spinner'

function SponsorThemesContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status') as ThemeStatus | null
  const { sponsorId, loading: authLoading } = useSponsorAuth()

  const [themes, setThemes] = useState<SponsorTheme[]>([])
  const [loading, setLoading] = useState(true)

  const loadThemes = useCallback(async () => {
    if (!sponsorId) return

    try {
      setLoading(true)

      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .eq('sponsor_id', sponsorId)

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
  }, [sponsorId, status])

  useEffect(() => {
    if (!authLoading) {
      loadThemes()
    }
  }, [authLoading, loadThemes])

  if (loading) {
    return <Loading />
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
        {THEME_STATUS_FILTERS.map((filter) => {
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
              ? `${THEME_STATUS_FILTERS.find((f) => f.value === status)?.label}のお題はありません`
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
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${getThemeStatusClassName(theme.status)}`}
                >
                  {getThemeStatusLabel(theme.status)}
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
    <Suspense fallback={<Loading />}>
      <SponsorThemesContent />
    </Suspense>
  )
}
