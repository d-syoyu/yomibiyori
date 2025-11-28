/**
 * Sponsor Support Chat Page
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getImpersonation } from '@/lib/impersonation'
import { useToast } from '@/lib/hooks/useToast'
import { useParams, useRouter } from 'next/navigation'
import { LoadingCenter } from '@/components/ui/Spinner'

interface Message {
  id: string
  message: string
  is_admin: boolean
  created_at: string
  sender_id: string
}

interface Ticket {
  id: string
  subject: string
  status: string
  created_at: string
}

export default function SponsorSupportChatPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (params?.id) {
      fetchTicketAndMessages()
    }
  }, [params?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function fetchTicketAndMessages() {
    try {
      const ticketId = params?.id as string
      
      // Fetch ticket info
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) throw ticketError
      setTicket(ticketData)

      // Fetch messages
      const { data: msgs, error: msgsError } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (msgsError) throw msgsError
      setMessages(msgs || [])
    } catch (error) {
      console.error('Failed to load chat:', error)
      toast.error('データの読み込みに失敗しました')
      router.push('/sponsor/support')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !ticket) return

    setSending(true)
    try {
      // Check for impersonation first
      const impersonation = getImpersonation()
      const { data: { user } } = await supabase.auth.getUser()

      // Determine sender ID - use impersonation if available, otherwise session
      let senderId: string
      if (impersonation) {
        senderId = impersonation.sponsorId
      } else if (user) {
        senderId = user.id
      } else {
        throw new Error('Not authenticated')
      }

      // Insert message
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: senderId,
          message: newMessage,
          is_admin: false
        })

      if (error) throw error

      setNewMessage('')
      fetchTicketAndMessages()
    } catch (error) {
      console.error('Failed to send:', error)
      toast.error('送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <LoadingCenter />
  }

  if (!ticket) return null

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-[var(--color-washi)] transition-colors"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            {ticket.subject}
          </h1>
          <span className="text-sm text-[var(--color-text-muted)]">
            {new Date(ticket.created_at).toLocaleString('ja-JP')}
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white/50 backdrop-blur-sm border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.is_admin
                    ? 'bg-white border border-[var(--color-border)] text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-igusa)] text-white'
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {msg.is_admin ? 'サポート担当' : 'あなた'} • {new Date(msg.created_at).toLocaleString('ja-JP')}
                </div>
                <div className="whitespace-pre-wrap">{msg.message}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-[var(--color-border)]">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="メッセージを入力..."
              rows={1}
              className="flex-1 px-4 py-3 border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-3 bg-[var(--color-igusa)] text-white font-bold rounded-xl hover:bg-[var(--color-igusa-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
