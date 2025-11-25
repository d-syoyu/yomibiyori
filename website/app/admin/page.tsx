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
  publishedThemes: number
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

// SVGアイコンコンポーネント
const ActivityIcon = ({ type }: { type: Activity['type'] }) => {
  switch (type) {
    case 'submit':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case 'purchase':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      )
    case 'approval':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'register':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      )
    case 'support':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      )
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalThemes: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    publishedThemes: 0,
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
        { data: published },
        { data: rejected },
      ] = await Promise.all([
        supabase.from('sponsor_themes').select('id'),
        supabase.from('sponsor_themes').select('id').eq('status', 'pending'),
        supabase.from('sponsor_themes').select('id').eq('status', 'approved'),
        supabase.from('sponsor_themes').select('id').eq('status', 'published'),
        supabase.from('sponsor_themes').select('id').eq('status', 'rejected'),
      ])

      setStats({
        totalThemes: total?.length || 0,
        pendingThemes: pending?.length || 0,
        approvedThemes: approved?.length || 0,
        publishedThemes: published?.length || 0,
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
      label: '審査待ち',
      value: stats.pendingThemes,
      color: 'from-yellow-400 to-orange-500',
      href: '/admin/themes?status=pending',
    },
    {
      label: '承認済み',
      value: stats.approvedThemes,
      color: 'from-green-400 to-emerald-500',
      href: '/admin/themes?status=approved',
    },
    {
      label: '配信済み',
      value: stats.publishedThemes,
      color: 'from-blue-400 to-cyan-500',
      href: '/admin/themes?status=published',
    },
    {
      label: '却下',
      value: stats.rejectedThemes,
      color: 'from-red-400 to-pink-500',
      href: '/admin/themes?status=rejected',
    },
    {
      label: '総お題数',
      value: stats.totalThemes,
      color: 'from-purple-400 to-indigo-500',
      href: '/admin/themes',
    },
  ]

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
  }

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
          管理者ダッシュボード
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
            お題管理
          </span>
        </h1>
        <p className="text-[var(--color-text-secondary)] max-w-2xl">
          スポンサーお題の審査状況とアクティビティを確認できます
        </p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="card group hover:bg-[var(--color-washi)] transition-colors">
            <div className="flex flex-col h-full justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">{card.label}</span>
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${card.color}`}></div>
              </div>
              <div className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                {card.value}
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-igusa)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
          </svg>
          クイックアクション
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/themes?status=pending" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--color-text-primary)]">審査待ちお題</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">承認待ちのお題をチェック</p>
            </div>
          </Link>
          <Link href="/admin/themes" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--color-text-primary)]">全てのお題</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">お題一覧を表示</p>
            </div>
          </Link>
          <Link href="/admin/sponsors" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--color-text-primary)]">スポンサー管理</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">スポンサー一覧を表示</p>
            </div>
          </Link>
          <Link href="/admin/announcements" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--color-text-primary)]">お知らせ管理</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">お知らせを作成・編集</p>
            </div>
          </Link>
          <Link href="/admin/support" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-[var(--color-text-primary)]">サポート対応</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">問い合わせに対応</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Activity Feed */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-igusa)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          最近のアクティビティ
        </h2>
        <div className="card space-y-1 bg-[var(--color-washi)]/50">
          {activities.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">アクティビティはありません</p>
          ) : (
            activities.map((activity, index) => (
              <div key={activity.id}>
                {index > 0 && <hr className="border-[var(--color-border)] my-3" />}
                <div className="flex items-center gap-4 p-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${activity.type === 'submit' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'purchase' ? 'bg-green-100 text-green-600' :
                      activity.type === 'approval' ? 'bg-yellow-100 text-yellow-600' :
                      activity.type === 'register' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'}`
                  }>
                    <ActivityIcon type={activity.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{activity.user}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">{activity.action}</p>
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] whitespace-nowrap shrink-0">
                    {activity.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
