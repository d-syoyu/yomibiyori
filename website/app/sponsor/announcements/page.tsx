/**
 * Sponsor Announcements Page
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components/ui/Spinner'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'update'
  is_pinned: boolean
  updated_at: string
  created_at: string
}

export default function SponsorAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [readMap, setReadMap] = useState<Record<string, string>>({})
  const router = useRouter()
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

    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('sponsor_announcements')
        .select('id, title, content, type, is_pinned, created_at, updated_at')
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
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
      ),
    },
    warning: {
      label: '注意',
      color: 'text-orange-600 border-orange-600 bg-orange-50',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
    },
    success: {
      label: 'New',
      color: 'text-green-600 border-green-600 bg-green-50',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.53.53 0 01.479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 01-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.53.53 0 01.48-.425 11.947 11.947 0 007.077-2.75zM10 15a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
        </svg>
      ),
    },
    update: {
      label: '更新',
      color: 'text-[var(--color-igusa)] border-[var(--color-igusa)] bg-[var(--color-washi)]',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0v2.433l-.31-.31a7 7 0 00-11.712 3.138.75.75 0 001.449.39 5.5 5.5 0 019.201-2.466l.312.311H14.25a.75.75 0 000 1.5h4.242z" clipRule="evenodd" />
        </svg>
      ),
    },
  }

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="page-container">
          <Loading />
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--color-igusa)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.467a23.849 23.849 0 01-.5-4.746" />
              </svg>
              運営からのお知らせ
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
