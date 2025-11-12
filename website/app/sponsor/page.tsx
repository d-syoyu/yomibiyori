/**
 * Sponsor Dashboard
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalThemes: number
  pendingThemes: number
  approvedThemes: number
  rejectedThemes: number
  publishedThemes: number
}

export default function SponsorDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalThemes: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    rejectedThemes: 0,
    publishedThemes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      // Get current user's campaigns
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .eq('sponsor_id', session.user.id)

      if (!campaigns || campaigns.length === 0) {
        setLoading(false)
        return
      }

      const campaignIds = campaigns.map(c => c.id)

      // Get themes stats
      const [
        { data: total },
        { data: pending },
        { data: approved },
        { data: rejected },
        { data: published },
      ] = await Promise.all([
        supabase.from('sponsor_themes').select('id').in('campaign_id', campaignIds),
        supabase.from('sponsor_themes').select('id').in('campaign_id', campaignIds).eq('status', 'pending'),
        supabase.from('sponsor_themes').select('id').in('campaign_id', campaignIds).eq('status', 'approved'),
        supabase.from('sponsor_themes').select('id').in('campaign_id', campaignIds).eq('status', 'rejected'),
        supabase.from('sponsor_themes').select('id').in('campaign_id', campaignIds).eq('status', 'published'),
      ])

      setStats({
        totalThemes: total?.length || 0,
        pendingThemes: pending?.length || 0,
        approvedThemes: approved?.length || 0,
        rejectedThemes: rejected?.length || 0,
        publishedThemes: published?.length || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: '審査待ち',
      value: stats.pendingThemes,
      color: 'from-yellow-400 to-orange-500',
      href: '/sponsor/themes?status=pending',
    },
    {
      label: '承認済み',
      value: stats.approvedThemes,
      color: 'from-green-400 to-emerald-500',
      href: '/sponsor/themes?status=approved',
    },
    {
      label: '配信済み',
      value: stats.publishedThemes,
      color: 'from-blue-400 to-indigo-500',
      href: '/sponsor/themes?status=published',
    },
    {
      label: '却下',
      value: stats.rejectedThemes,
      color: 'from-red-400 to-pink-500',
      href: '/sponsor/themes?status=rejected',
    },
    {
      label: '総お題数',
      value: stats.totalThemes,
      color: 'from-purple-400 to-violet-500',
      href: '/sponsor/themes',
    },
  ]

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
  }

  return (
    <div className="page-wrapper">
      <div className="page-container space-y-10">
        <header className="space-y-2 text-center md:text-left">
          <span className="badge">スポンサー</span>
          <h1 className="section-heading text-3xl">ダッシュボード</h1>
          <p className="section-subheading text-left">
            投稿したお題の管理状況と審査ステータスを確認できます。
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {statCards.map((card) => (
            <a key={card.label} href={card.href} className="card group">
              <div
                className={`inline-flex p-3 rounded-xl text-white text-2xl font-bold bg-gradient-to-r ${card.color}`}
              >
                {card.value}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)]">
                {card.label}
              </h3>
            </a>
          ))}
        </section>

        <section className="card space-y-4">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">クイックアクション</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/sponsor/themes/new" className="btn-secondary w-full justify-between">
              <span>新しいお題を投稿</span>
              <span>→</span>
            </a>
            <a href="/sponsor/themes?status=pending" className="btn-secondary w-full justify-between">
              <span>審査待ちお題を確認</span>
              <span>→</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
