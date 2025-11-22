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
      <div className="page-container space-y-12">
        <header className="space-y-4 text-center md:text-left pt-8">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            スポンサーダッシュボード
          </div>
          <h1 className="section-heading text-3xl md:text-4xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              お題管理・インサイト
            </span>
          </h1>
          <p className="section-subheading text-left max-w-2xl">
            投稿したお題の審査状況や、ユーザーからの反応をリアルタイムで確認できます。
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {statCards.map((card) => (
            <a key={card.label} href={card.href} className="card group hover:bg-[var(--color-washi)] transition-colors">
              <div className="flex flex-col h-full justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{card.label}</span>
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${card.color}`}></div>
                </div>
                <div className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                  {card.value}
                </div>
              </div>
            </a>
          ))}
        </section>

        <section className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span className="text-2xl">🚀</span> クイックアクション
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <a href="/sponsor/themes/new" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
                <div className="w-12 h-12 rounded-full bg-[var(--color-washi)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  ✨
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[var(--color-text-primary)]">新しいお題を作成</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">季節やイベントに合わせたお題を投稿</p>
                </div>
              </a>
              <a href="/sponsor/themes?status=pending" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
                <div className="w-12 h-12 rounded-full bg-[var(--color-washi)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  👀
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[var(--color-text-primary)]">審査状況を確認</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">承認待ちのお題をチェック</p>
                </div>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span className="text-2xl">📢</span> お知らせ
            </h2>
            <div className="card space-y-4 bg-[var(--color-washi)]/50">
              <div className="space-y-2">
                <span className="text-xs font-medium text-[var(--color-igusa)] border border-[var(--color-igusa)] px-2 py-0.5 rounded-full">New</span>
                <p className="text-sm text-[var(--color-text-primary)]">
                  年末年始の特別キャンペーンお題の募集を開始しました。
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">2024/11/20</p>
              </div>
              <hr className="border-[var(--color-border)]" />
              <div className="space-y-2">
                <p className="text-sm text-[var(--color-text-primary)]">
                  インサイト機能がアップデートされました。
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">2024/11/15</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
