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
  credits: number
}

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'update'
  is_pinned: boolean
  updated_at: string
  created_at: string
}

interface ThemeNotification {
  id: string
  sponsor_theme_id: string
  status: 'approved' | 'rejected' | 'published'
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function SponsorDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalThemes: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    rejectedThemes: 0,
    publishedThemes: 0,
    credits: 0,
  })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [themeNotifications, setThemeNotifications] = useState<ThemeNotification[]>([])
  const [readMap, setReadMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const READ_STORAGE_KEY = 'sponsorAnnouncementRead'

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(READ_STORAGE_KEY) : null
    if (stored) {
      try {
        setReadMap(JSON.parse(stored))
      } catch {
        setReadMap({})
      }
    }

    loadStats()
    loadAnnouncements()
    loadThemeNotifications()
  }, [])

  async function loadStats() {
    try {
      // Get current user's campaigns
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get sponsor credits
      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('credits')
        .eq('id', session.user.id)
        .single()

      const { data: campaigns } = await supabase
        .from('sponsor_campaigns')
        .select('id')
        .eq('sponsor_id', session.user.id)

      if (!campaigns || campaigns.length === 0) {
        setStats(prev => ({
          ...prev,
          credits: sponsor?.credits || 0,
        }))
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
        credits: sponsor?.credits || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('sponsor_announcements')
        .select('id, title, content, type, is_pinned, created_at, updated_at')
        .eq('is_published', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Failed to load announcements:', error)
    }
  }

  async function loadThemeNotifications() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('sponsor_theme_notifications')
        .select('*')
        .eq('sponsor_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setThemeNotifications(data || [])
    } catch (error) {
      console.error('Failed to load theme notifications:', error)
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('sponsor_theme_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (error) throw error

      // Update local state
      setThemeNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
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
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
              スポンサーダッシュボード
            </div>
            <a
              href="/sponsor/profile"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-ai)] transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg> プロフィール設定
            </a>
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

        {/* Credit Balance Banner */}
        <section className="card border-2 border-[var(--color-igusa)] bg-gradient-to-br from-[var(--color-washi)] to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-igusa)]">利用可能クレジット</p>
              <p className="text-5xl font-bold font-serif text-[var(--color-igusa)]">{stats.credits}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">1クレジット = お題1件の投稿</p>
            </div>
            <a
              href="/sponsor/credits"
              className="px-8 py-3 bg-[var(--color-igusa)] text-white rounded-lg font-bold hover:bg-[var(--color-igusa-light)] transition-all text-center shadow-lg hover:shadow-xl transform hover:scale-105 self-start md:self-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 inline-block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg> クレジット購入
            </a>
          </div>
        </section>

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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2 text-[var(--color-igusa)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg> クイックアクション
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <a href="/sponsor/themes/new" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
                <div className="w-12 h-12 rounded-full bg-[var(--color-washi)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[var(--color-text-primary)]">新しいお題を作成</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">季節やイベントに合わせたお題を投稿</p>
                </div>
              </a>
              <a href="/sponsor/themes?status=pending" className="card group hover:border-[var(--color-igusa)] transition-colors flex flex-col justify-center items-center text-center space-y-3 py-8">
                <div className="w-12 h-12 rounded-full bg-[var(--color-washi)] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-[var(--color-text-primary)]">審査状況を確認</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">承認待ちのお題をチェック</p>
                </div>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            {/* お題の通知 */}
            {themeNotifications.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2 text-[var(--color-igusa)]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg> お題の通知
                  {themeNotifications.filter(n => !n.is_read).length > 0 && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                      {themeNotifications.filter(n => !n.is_read).length}
                    </span>
                  )}
                </h2>
                <div className="card space-y-3 bg-[var(--color-washi)]/50 max-h-96 overflow-y-auto">
                  {themeNotifications.map((notification, index) => (
                    <div key={notification.id}>
                      {index > 0 && <hr className="border-[var(--color-border)]" />}
                      <a
                        href={`/sponsor/themes?status=${notification.status}`}
                        className={`block space-y-2 hover:opacity-75 transition-opacity ${notification.is_read ? 'opacity-60' : ''}`}
                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                      >
                        <div className="flex items-center gap-2">
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                          {notification.status === 'approved' && (
                            <span className="text-xs font-medium text-green-600 border border-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                              </svg>
                              承認
                            </span>
                          )}
                          {notification.status === 'rejected' && (
                            <span className="text-xs font-medium text-red-600 border border-red-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                              </svg>
                              却下
                            </span>
                          )}
                          {notification.status === 'published' && (
                            <span className="text-xs font-medium text-blue-600 border border-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                              </svg>
                              配信
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {new Date(notification.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </a>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 一般お知らせ */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2 text-[var(--color-igusa)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.467a23.849 23.849 0 01-.5-4.746" />
                </svg> お知らせ
              </h2>
              {announcements.length > 0 && (
                <a
                  href="/sponsor/announcements"
                  className="text-sm text-[var(--color-igusa)] hover:text-[var(--color-igusa-light)] transition-colors"
                >
                  すべて見る →
                </a>
              )}
            </div>
            <div className="card space-y-3 bg-[var(--color-washi)]/50">
              {announcements.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">
                  現在お知らせはありません
                </p>
              ) : (
                announcements.slice(0, 5).map((announcement, index) => (
                  <div key={announcement.id}>
                    {index > 0 && <hr className="border-[var(--color-border)]" />}
                    <a
                      href={`/sponsor/announcements/${announcement.id}`}
                      className="block space-y-2 hover:opacity-75 transition-opacity"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {readMap[announcement.id] !== announcement.updated_at && (
                          <span className="text-xs font-medium text-white bg-[var(--color-igusa)] px-2 py-0.5 rounded-full">
                            未読
                          </span>
                        )}
                        {announcement.is_pinned && (
                          <span className="text-xs font-medium text-red-600 border border-red-600 px-2 py-0.5 rounded-full bg-red-50 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                            </svg>
                            重要
                          </span>
                        )}
                        {announcement.type === 'success' && (
                          <span className="text-xs font-medium text-green-600 border border-green-600 px-2 py-0.5 rounded-full bg-green-50 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                              <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.53.53 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.53.53 0 01.48-.425 11.947 11.947 0 007.077-2.75zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                            </svg>
                            New
                          </span>
                        )}
                        {announcement.type === 'warning' && (
                          <span className="text-xs font-medium text-orange-600 border border-orange-600 px-2 py-0.5 rounded-full bg-orange-50 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            注意
                          </span>
                        )}
                        {announcement.type === 'update' && (
                          <span className="text-xs font-medium text-[var(--color-igusa)] border border-[var(--color-igusa)] px-2 py-0.5 rounded-full bg-[var(--color-washi)] flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H14.25a.75.75 0 000 1.5h4.242z" clipRule="evenodd" />
                            </svg>
                            更新
                          </span>
                        )}
                        {announcement.type === 'info' && (
                          <span className="text-xs font-medium text-blue-600 border border-blue-600 px-2 py-0.5 rounded-full bg-blue-50 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                            </svg>
                            情報
                          </span>
                        )}
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(announcement.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                        {announcement.title}
                      </h3>
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
