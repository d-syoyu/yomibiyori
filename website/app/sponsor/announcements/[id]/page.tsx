/**
 * Individual Sponsor Announcement Page
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'update'
  is_pinned: boolean
  updated_at: string
  created_at: string
}

export default function AnnouncementDetailPage() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const READ_STORAGE_KEY = 'sponsorAnnouncementRead'

  useEffect(() => {
    loadAnnouncement()
  }, [id])

  useEffect(() => {
    if (!announcement) return
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(READ_STORAGE_KEY) : null
      const map: Record<string, string> = stored ? JSON.parse(stored) : {}
      if (map[announcement.id] === announcement.updated_at) return
      const next = { ...map, [announcement.id]: announcement.updated_at }
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore storage errors; unread badge will persist until storage is available
    }
  }, [announcement])

  async function loadAnnouncement() {
    try {
      const { data, error } = await supabase
        .from('sponsor_announcements')
        .select('id, title, content, type, is_pinned, created_at, updated_at')
        .eq('id', id)
        .eq('is_published', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .single()

      if (error) throw error
      setAnnouncement(data)
    } catch (error) {
      console.error('Failed to load announcement:', error)
      setError('お知らせの読み込みに失敗しました')
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

  if (error || !announcement) {
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
          </header>
          <div className="card text-center py-12">
            <p className="text-[var(--color-text-muted)]">
              {error || 'お知らせが見つかりませんでした'}
            </p>
          </div>
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
            お知らせ
          </div>
        </header>

        <section className="card">
          <div className="space-y-4">
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

            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {announcement.title}
            </h1>

            <div className="prose max-w-none">
              <p className="text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                {announcement.content}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
