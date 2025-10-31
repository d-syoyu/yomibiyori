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
    return <div className="text-purple-900">読み込み中...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-purple-900 mb-2">
          ダッシュボード
        </h1>
        <p className="text-purple-700">
          投稿したお題の管理状況を確認できます
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="block group"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div
                className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${card.color} mb-4`}
              >
                <span className="text-white text-2xl font-bold">
                  {card.value}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-purple-900 group-hover:text-purple-700 transition-colors">
                {card.label}
              </h3>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-lg">
        <h2 className="text-xl font-bold text-purple-900 mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/sponsor/themes/new"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 hover:border-purple-300 transition-all group"
          >
            <span className="font-medium text-purple-900">
              新しいお題を投稿
            </span>
            <span className="text-purple-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </a>
          <a
            href="/sponsor/themes?status=pending"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 hover:border-yellow-300 transition-all group"
          >
            <span className="font-medium text-yellow-900">
              審査待ちお題を確認
            </span>
            <span className="text-yellow-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}
