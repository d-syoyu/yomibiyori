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

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'update'
  is_pinned: boolean
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
  })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [themeNotifications, setThemeNotifications] = useState<ThemeNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
    loadAnnouncements()
    loadThemeNotifications()
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

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('sponsor_announcements')
        .select('id, title, content, type, is_pinned, created_at')
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
            {/* お題の通知 */}
            {themeNotifications.length > 0 && (
              <>
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span className="text-2xl">🔔</span> お題の通知
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
                            <span className="text-xs font-medium text-green-600 border border-green-600 px-2 py-0.5 rounded-full">✅ 承認</span>
                          )}
                          {notification.status === 'rejected' && (
                            <span className="text-xs font-medium text-red-600 border border-red-600 px-2 py-0.5 rounded-full">❌ 却下</span>
                          )}
                          {notification.status === 'published' && (
                            <span className="text-xs font-medium text-blue-600 border border-blue-600 px-2 py-0.5 rounded-full">🚀 配信</span>
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
                <span className="text-2xl">📢</span> お知らせ
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
                        {announcement.is_pinned && (
                          <span className="text-xs font-medium text-red-600 border border-red-600 px-2 py-0.5 rounded-full bg-red-50">📌 重要</span>
                        )}
                        {announcement.type === 'success' && (
                          <span className="text-xs font-medium text-green-600 border border-green-600 px-2 py-0.5 rounded-full bg-green-50">✨ New</span>
                        )}
                        {announcement.type === 'warning' && (
                          <span className="text-xs font-medium text-orange-600 border border-orange-600 px-2 py-0.5 rounded-full bg-orange-50">⚠️ 注意</span>
                        )}
                        {announcement.type === 'update' && (
                          <span className="text-xs font-medium text-[var(--color-igusa)] border border-[var(--color-igusa)] px-2 py-0.5 rounded-full bg-[var(--color-washi)]">🔄 更新</span>
                        )}
                        {announcement.type === 'info' && (
                          <span className="text-xs font-medium text-blue-600 border border-blue-600 px-2 py-0.5 rounded-full bg-blue-50">ℹ️ 情報</span>
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
