/**
 * Sponsor Support List Page
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getImpersonation } from '@/lib/impersonation'
import Link from 'next/link'

interface Ticket {
  id: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
}

export default function SponsorSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTickets()
  }, [])

  async function fetchTickets() {
    try {
      // Check for impersonation first
      const impersonation = getImpersonation()
      const { data: { user } } = await supabase.auth.getUser()

      // Determine user ID - use impersonation if available, otherwise session
      let userId: string
      if (impersonation) {
        userId = impersonation.sponsorId
      } else if (user) {
        userId = user.id
      } else {
        return
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      open: '受付中',
      in_progress: '対応中',
      resolved: '解決済み',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="section-heading text-3xl mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
            サポート
          </span>
        </h1>
        <p className="section-subheading">
          お問い合わせ履歴と返信を確認できます
        </p>
      </header>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--color-text-muted)]">読み込み中...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[var(--color-text-secondary)] mb-4">お問い合わせ履歴はありません</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              右下のボタンから新規のお問い合わせができます
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/sponsor/support/${ticket.id}`}
                className="block p-6 hover:bg-[var(--color-washi)] transition-colors group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(ticket.status)}
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {new Date(ticket.created_at).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-igusa)] transition-colors">
                      {ticket.subject}
                    </h3>
                  </div>
                  <span className="text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
