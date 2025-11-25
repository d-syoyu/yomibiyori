/**
 * Admin Support Page
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Ticket {
  id: string
  user_id: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  user?: {
    name: string
    email: string
  }
}

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  sender_id: string
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTickets()
  }, [filter])

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id)
    }
  }, [selectedTicket])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchTickets() {
    setLoading(true)
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          user:users(name, email)
        `)
        .order('created_at', { ascending: false })

      if (filter === 'open') {
        query = query.in('status', ['open', 'in_progress'])
      } else if (filter === 'resolved') {
        query = query.eq('status', 'resolved')
      }

      const { data, error } = await query

      if (error) throw error
      setTickets(data as any || [])
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages(ticketId: string) {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTicket || !replyText.trim()) return

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Insert admin message
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          message: replyText,
          is_admin: true
        })

      if (error) throw error

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id)

        // Update local state
        setTickets(tickets.map(t =>
          t.id === selectedTicket.id ? { ...t, status: 'in_progress' } : t
        ))
      }

      setReplyText('')
      fetchMessages(selectedTicket.id)
    } catch (error) {
      console.error('Failed to reply:', error)
      alert('返信の送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  async function handleResolve() {
    if (!selectedTicket) return
    if (!confirm('この問い合わせを解決済みにしますか？')) return

    try {
      await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', selectedTicket.id)

      // Update local state
      setTickets(tickets.map(t =>
        t.id === selectedTicket.id ? { ...t, status: 'resolved' } : t
      ))
      setSelectedTicket({ ...selectedTicket, status: 'resolved' })
      alert('解決済みにしました')
    } catch (error) {
      console.error('Failed to resolve:', error)
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      open: 'bg-red-100 text-red-800 border-red-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-gray-100 text-gray-800 border-gray-200',
    }
    const labels = {
      open: '未対応',
      in_progress: '対応中',
      resolved: '解決済み',
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  return (
    <div className="-mt-6 space-y-4 h-[calc(100vh-130px)] flex flex-col">
      <header className="flex justify-between items-center shrink-0">
        <div className="space-y-1">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            サポート
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">サポート問い合わせ</h1>
          <p className="text-[var(--color-text-secondary)]">ユーザーからの問い合わせを確認・返信できます</p>
        </div>
        <div className="flex gap-1 bg-white p-1 rounded-lg border border-[var(--color-border)]">
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'open'
                ? 'bg-[var(--color-washi)] text-[var(--color-igusa)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-washi)]/50'
            }`}
          >
            未対応
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'resolved'
                ? 'bg-[var(--color-washi)] text-[var(--color-igusa)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-washi)]/50'
            }`}
          >
            解決済み
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-[var(--color-washi)] text-[var(--color-igusa)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-washi)]/50'
            }`}
          >
            全て
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Ticket List */}
        <div className="w-1/3 card overflow-hidden flex flex-col p-0">
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-washi)]/50">
            <h3 className="font-bold text-[var(--color-text-primary)]">問い合わせ一覧 ({tickets.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-[var(--color-text-secondary)]">読み込み中...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-[var(--color-text-secondary)]">該当する問い合わせはありません</div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {tickets.map((ticket) => (
                  <li
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`hover:bg-[var(--color-washi)]/50 cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-[var(--color-washi)] border-l-4 border-[var(--color-igusa)]' : ''
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        {getStatusBadge(ticket.status)}
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-[var(--color-text-primary)] mb-1 line-clamp-1">{ticket.subject}</h4>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        {ticket.user?.name || '不明'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className="flex-1 card overflow-hidden flex flex-col p-0">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-washi)]/50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-[var(--color-text-primary)]">{selectedTicket.subject}</h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {selectedTicket.user?.name} ({selectedTicket.user?.email})
                  </p>
                </div>
                {selectedTicket.status !== 'resolved' && (
                  <button
                    onClick={handleResolve}
                    className="px-3 py-1 text-sm border border-green-600 text-green-600 rounded hover:bg-green-50"
                  >
                    解決済みにする
                  </button>
                )}
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        msg.is_admin
                          ? 'bg-[var(--color-igusa)] text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className={`text-xs mb-1 ${msg.is_admin ? 'text-white/70' : 'text-gray-500'}`}>
                        {msg.is_admin ? '管理者 (あなた)' : selectedTicket.user?.name} • {new Date(msg.created_at).toLocaleString('ja-JP')}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Area */}
              <div className="px-4 py-3 bg-white border-t border-[var(--color-border)] shrink-0">
                <form onSubmit={handleReply} className="flex gap-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="返信を入力..."
                    rows={2}
                    className="flex-1 px-4 py-2 border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleReply(e)
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-6 py-2 bg-[var(--color-igusa)] text-white font-bold rounded-xl hover:bg-[var(--color-igusa-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-fit self-end"
                  >
                    送信
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
              左側のリストから問い合わせを選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
