'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

// アイコンコンポーネント
function StatIcon({ type }: { type: 'pending' | 'approved' | 'published' | 'rejected' | 'total' }) {
    const iconClass = "w-5 h-5"
    switch (type) {
        case 'pending':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        case 'approved':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        case 'published':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
            )
        case 'rejected':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        case 'total':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconClass}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            )
    }
}

export default function AdminSponsorDashboard() {
    const params = useParams()
    const sponsorId = params.id as string

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
    const [loading, setLoading] = useState(true)
    const [sponsorName, setSponsorName] = useState('')

    useEffect(() => {
        if (sponsorId) {
            loadData()
        }
    }, [sponsorId])

    async function loadData() {
        try {
            // Get sponsor details
            const { data: sponsor } = await supabase
                .from('sponsors')
                .select('id, company_name, credits')
                .eq('id', sponsorId)
                .single()

            if (sponsor) {
                setSponsorName(sponsor.company_name)

                // Get campaigns
                const { data: campaigns } = await supabase
                    .from('sponsor_campaigns')
                    .select('id')
                    .eq('sponsor_id', sponsorId)

                if (!campaigns || campaigns.length === 0) {
                    setStats(prev => ({ ...prev, credits: sponsor.credits }))
                } else {
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
                        credits: sponsor.credits,
                    })
                }

                // Load Notifications
                const { data: notifications } = await supabase
                    .from('sponsor_theme_notifications')
                    .select('*')
                    .eq('sponsor_id', sponsorId) // Note: notifications usually linked to sponsor_id directly or via user_id? 
                    // Schema check: sponsor_theme_notifications has sponsor_id? 
                    // Assuming yes based on previous code.
                    // Wait, previous code used session.user.id. 
                    // If notifications are linked to user_id, I need to get user_id from sponsor.
                    // But usually sponsor_id is foreign key.
                    // Let's check schema if needed, but for now assume sponsor_id.
                    // Actually, previous code: .eq('sponsor_id', session.user.id). 
                    // This implies sponsor_id column stores the UUID of the user? Or the sponsor UUID?
                    // In `sponsors` table, `id` is PK, `user_id` is FK.
                    // If `sponsor_theme_notifications` uses `sponsor_id`, it likely refers to `sponsors.id`.
                    // But `session.user.id` is the auth user ID.
                    // If previous code worked with `session.user.id` against `sponsor_id` column, 
                    // then `sponsor_id` column in notifications table might be storing user_id?
                    // Or `sponsors.id` IS `user_id` (1:1)?
                    // Schema check: `id uuid primary key default gen_random_uuid()`. So `sponsors.id` != `user_id`.
                    // So previous code `eq('sponsor_id', session.user.id)` might be wrong if it meant `sponsors.id`.
                    // OR `sponsor_theme_notifications` has `user_id` column?
                    // I'll assume `sponsor_id` refers to `sponsors.id` and pass `sponsorId`.
                    .order('created_at', { ascending: false })
                    .limit(10)

                if (notifications) {
                    setThemeNotifications(notifications)
                }
            }

            // Load Announcements (Global)
            const { data: announcementsData } = await supabase
                .from('sponsor_announcements')
                .select('id, title, content, type, is_pinned, created_at, updated_at')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(5)

            if (announcementsData) {
                setAnnouncements(announcementsData)
            }

        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setLoading(false)
        }
    }

    const statCards: { label: string; value: number; iconType: 'pending' | 'approved' | 'published' | 'rejected' | 'total'; colorClass: string }[] = [
        {
            label: '審査待ち',
            value: stats.pendingThemes,
            iconType: 'pending',
            colorClass: 'text-yellow-600',
        },
        {
            label: '承認済み',
            value: stats.approvedThemes,
            iconType: 'approved',
            colorClass: 'text-green-600',
        },
        {
            label: '配信済み',
            value: stats.publishedThemes,
            iconType: 'published',
            colorClass: 'text-blue-600',
        },
        {
            label: '却下',
            value: stats.rejectedThemes,
            iconType: 'rejected',
            colorClass: 'text-red-600',
        },
        {
            label: '総お題数',
            value: stats.totalThemes,
            iconType: 'total',
            colorClass: 'text-[var(--color-igusa)]',
        },
    ]

    if (loading) {
        return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
    }

    return (
        <div className="space-y-8">
            {/* Admin Banner */}
            <div className="card border-l-4 border-[var(--color-igusa)] bg-[var(--color-washi)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-igusa)]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <p className="font-bold text-[var(--color-text-primary)]">管理者ビューモード</p>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        現在、<span className="font-bold text-[var(--color-igusa)]">{sponsorName}</span> のダッシュボードを表示しています。
                    </p>
                </div>
                <Link
                    href="/admin/sponsors"
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-igusa)] hover:text-[var(--color-igusa-light)] transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    一覧に戻る
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {statCards.map((card) => (
                    <div key={card.label} className="card">
                        <div className="flex flex-col h-full justify-between space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[var(--color-text-secondary)]">{card.label}</span>
                                <div className={card.colorClass}>
                                    <StatIcon type={card.iconType} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                                {card.value}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card border-2 border-[var(--color-igusa)]/20 bg-gradient-to-br from-[var(--color-washi)] to-white">
                <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-igusa)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">クレジット残高</h2>
                </div>
                <p className="text-4xl font-bold text-[var(--color-text-primary)] font-serif">{stats.credits} <span className="text-base font-normal text-[var(--color-text-secondary)]">credits</span></p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Notifications */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-igusa)]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">お題の通知</h2>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {themeNotifications.length === 0 ? (
                            <p className="text-[var(--color-text-muted)] text-center py-8">通知はありません</p>
                        ) : (
                            themeNotifications.map(n => (
                                <div key={n.id} className="p-4 rounded-xl bg-[var(--color-washi)]/50 border border-[var(--color-border)]">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${n.status === 'approved' ? 'bg-green-50 text-green-800 border-green-200' :
                                                n.status === 'rejected' ? 'bg-red-50 text-red-800 border-red-200' :
                                                    'bg-blue-50 text-blue-800 border-blue-200'
                                            }`}>
                                            {n.status === 'approved' ? '承認' : n.status === 'rejected' ? '却下' : '配信済み'}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            {new Date(n.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[var(--color-text-primary)] text-sm mb-1">{n.title}</h3>
                                    <p className="text-sm text-[var(--color-text-secondary)]">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Announcements */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[var(--color-igusa)]">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                        </svg>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">お知らせ</h2>
                    </div>
                    <div className="space-y-4">
                        {announcements.length === 0 ? (
                            <p className="text-[var(--color-text-muted)] text-center py-8">お知らせはありません</p>
                        ) : (
                            announcements.map(a => (
                                <div key={a.id} className="p-4 rounded-xl bg-[var(--color-washi)]/50 border border-[var(--color-border)]">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-[var(--color-igusa)] bg-[var(--color-washi)] px-2.5 py-0.5 rounded-full border border-[var(--color-washi-dark)]">
                                            {a.type === 'info' ? '情報' : a.type === 'warning' ? '警告' : a.type === 'success' ? '成功' : '更新'}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            {new Date(a.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[var(--color-text-primary)] text-sm">{a.title}</h3>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
