/**
 * Admin Dashboard
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Stats {
  totalThemes: number
  pendingThemes: number
  approvedThemes: number
  rejectedThemes: number
}

interface Activity {
  id: string
  type: 'submit' | 'purchase' | 'approval' | 'register' | 'support'
  user: string
  action: string
  time: string
  rawTime: Date
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalThemes: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    rejectedThemes: 0,
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      // 1. Load Stats
      const [
        { data: total },
        { data: pending },
        { data: approved },
        { data: rejected },
      ] = await Promise.all([
        supabase.from('sponsor_themes').select('id'),
        supabase.from('sponsor_themes').select('id').eq('status', 'pending'),
        supabase.from('sponsor_themes').select('id').eq('status', 'approved'),
        supabase.from('sponsor_themes').select('id').eq('status', 'rejected'),
      ])

      setStats({
        totalThemes: total?.length || 0,
        pendingThemes: pending?.length || 0,
        approvedThemes: approved?.length || 0,
        rejectedThemes: rejected?.length || 0,
      })

      // 2. Load Activity Feed
      // Fetch recent items from multiple tables
      const limit = 5
      const [
        { data: recentThemes },
        { data: recentPurchases },
        { data: recentUsers },
        { data: recentTickets }
      ] = await Promise.all([
        supabase.from('sponsor_themes').select('*, campaign:sponsor_campaigns(sponsor:sponsors(company_name))').order('created_at', { ascending: false }).limit(limit),
        supabase.from('sponsor_credit_transactions').select('*, sponsor:sponsors(company_name)').eq('transaction_type', 'purchase').order('created_at', { ascending: false }).limit(limit),
        supabase.from('users').select('id, name, role, created_at').order('created_at', { ascending: false }).limit(limit),
        supabase.from('support_tickets').select('*, user:users(name)').order('created_at', { ascending: false }).limit(limit)
      ])

      const feed: Activity[] = []

      recentThemes?.forEach((t: any) => {
        feed.push({
          id: `theme-${t.id}`,
          type: 'submit',
          user: t.campaign?.sponsor?.company_name || '不明なスポンサー',
          action: `お題「${t.text_575}」を投稿しました`,
          time: '',
          rawTime: new Date(t.created_at)
        })
      })

      recentPurchases?.forEach((p: any) => {
        feed.push({
          id: `purchase-${p.id}`,
          type: 'purchase',
          user: p.sponsor?.company_name || '不明なスポンサー',
          action: `${p.amount}クレジットを購入しました`,
          time: '',
          rawTime: new Date(p.created_at)
        })
      })

      recentUsers?.forEach((u: any) => {
        feed.push({
          id: `user-${u.id}`,
          type: 'register',
          user: u.name || '新規ユーザー',
          action: `${u.role === 'sponsor' ? 'スポンサー' : 'ユーザー'}として登録しました`,
          time: '',
          rawTime: new Date(u.created_at)
        })
      })

      recentTickets?.forEach((t: any) => {
        feed.push({
          id: `ticket-${t.id}`,
          type: 'support',
          user: t.user?.name || '不明なユーザー',
          action: `問い合わせ「${t.subject}」を受信しました`,
          time: '',
          rawTime: new Date(t.created_at)
        })
      })

      // Sort by time desc and take top 5
      const sortedFeed = feed.sort((a, b) => b.rawTime.getTime() - a.rawTime.getTime()).slice(0, 5)
      
      // Format relative time
      const now = new Date()
      const finalFeed = sortedFeed.map(item => {
        const diff = (now.getTime() - item.rawTime.getTime()) / 1000 / 60 // minutes
        let timeStr = ''
        if (diff < 60) timeStr = `${Math.floor(diff)}分前`
        else if (diff < 60 * 24) timeStr = `${Math.floor(diff / 60)}時間前`
        else timeStr = `${Math.floor(diff / (60 * 24))}日前`
        return { ...item, time: timeStr }
      })

      setActivities(finalFeed)

    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: '審査待ちお題',
      value: stats.pendingThemes,
      color: 'from-yellow-400 to-orange-500',
      href: '/admin/themes?status=pending',
    },
    {
      label: '承認済みお題',
      value: stats.approvedThemes,
      color: 'from-green-400 to-emerald-500',
      href: '/admin/themes?status=approved',
    },
    {
      label: '却下お題',
      value: stats.rejectedThemes,
      color: 'from-red-400 to-pink-500',
      href: '/admin/themes?status=rejected',
    },
    {
      label: '総お題数',
      value: stats.totalThemes,
      color: 'from-blue-400 to-indigo-500',
      href: '/admin/themes',
    },
  ]

  if (loading) {
    return <div className="text-amber-900">読み込み中...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          ダッシュボード
        </h1>
        <p className="text-amber-700">
          スポンサーお題の管理状況を確認できます
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="block group"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div
                className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${card.color} mb-4`}
              >
                <span className="text-white text-2xl font-bold">
                  {card.value}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-amber-900 group-hover:text-amber-700 transition-colors">
                {card.label}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg">
        <h2 className="text-xl font-bold text-amber-900 mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/themes?status=pending"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 hover:border-yellow-300 transition-all group"
          >
            <span className="font-medium text-yellow-900">
              審査待ちお題を確認
            </span>
            <span className="text-yellow-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
          <Link
            href="/admin/themes"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 hover:border-purple-300 transition-all group"
          >
            <span className="font-medium text-purple-900">
              全てのお題を表示
            </span>
            <span className="text-purple-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
          <Link
            href="/admin/announcements"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-300 transition-all group"
          >
            <span className="font-medium text-blue-900">
              お知らせを管理
            </span>
            <span className="text-blue-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
          <Link
            href="/admin/sponsors"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 hover:border-green-300 transition-all group"
          >
            <span className="font-medium text-green-900">
              スポンサーを管理
            </span>
            <span className="text-green-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
          <Link
            href="/admin/support"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 hover:border-pink-300 transition-all group"
          >
            <span className="font-medium text-pink-900">
              問い合わせ対応
            </span>
            <span className="text-pink-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg">
        <h2 className="text-xl font-bold text-amber-900 mb-4">
          アクティビティ
        </h2>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-amber-700 text-center py-4">アクティビティはありません</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0
                  ${activity.type === 'submit' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'purchase' ? 'bg-green-100 text-green-600' :
                    activity.type === 'approval' ? 'bg-yellow-100 text-yellow-600' :
                    activity.type === 'register' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'}`
                }>
                  {activity.type === 'submit' ? '📝' :
                   activity.type === 'purchase' ? '💰' :
                   activity.type === 'approval' ? '✅' :
                   activity.type === 'register' ? '👤' : '❓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-amber-900 truncate">{activity.user}</p>
                  <p className="text-xs text-amber-700 truncate">{activity.action}</p>
                </div>
                <div className="text-xs text-amber-600 whitespace-nowrap shrink-0">
                  {activity.time}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
