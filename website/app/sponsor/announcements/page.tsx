/**
 * Sponsor Announcements Page
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'update'
  is_pinned: boolean
  created_at: string
}

export default function SponsorAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('sponsor_announcements')
        .select('id, title, content, type, is_pinned, created_at')
        .eq('is_published', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Failed to load announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const typeConfig = {
    info: {
      label: '情報',
      color: 'text-blue-600 border-blue-600 bg-blue-50',
      icon: 'ℹ️',
    },
    warning: {
      label: '注意',
      color: 'text-orange-600 border-orange-600 bg-orange-50',
      icon: '⚠️',
    },
    success: {
      label: 'New',
      color: 'text-green-600 border-green-600 bg-green-50',
      icon: '✨',
    },
    update: {
      label: '更新',
      color: 'text-[var(--color-igusa)] border-[var(--color-igusa)] bg-[var(--color-washi)]',
      icon: '🔄',
    },
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="page-container">
          <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <div className="page-container space-y-8">
        <header className="space-y-4 pt-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ← 戻る
          </button>
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            お知らせ一覧
          </div>
          <h1 className="section-heading text-3xl md:text-4xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              📢 運営からのお知らせ
            </span>
          </h1>
        </header>

        <section className="space-y-4">
          {announcements.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-[var(--color-text-muted)]">現在お知らせはありません</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div key={announcement.id} className="card hover:border-[var(--color-igusa)] transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {announcement.is_pinned && (
                        <span className="text-xs font-medium text-red-600 border border-red-600 px-2 py-0.5 rounded-full bg-red-50">
                          📌 重要
                        </span>
                      )}
                      <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${typeConfig[announcement.type].color}`}>
                        {typeConfig[announcement.type].icon} {typeConfig[announcement.type].label}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(announcement.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {announcement.title}
                  </h2>

                  <p className="text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                    {announcement.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}
