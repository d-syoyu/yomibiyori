'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!message.trim()) return

        setSending(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // 1. Create Ticket
            const subject = message.length > 30 ? message.substring(0, 30) + '...' : message
            const { data: ticket, error: ticketError } = await supabase
                .from('support_tickets')
                .insert({
                    user_id: user.id,
                    subject: subject,
                    status: 'open'
                })
                .select()
                .single()

            if (ticketError) throw ticketError

            // 2. Create First Message
            const { error: msgError } = await supabase
                .from('support_ticket_messages')
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    message: message,
                    is_admin: false
                })

            if (msgError) throw msgError

            setSent(true)
            setMessage('')
            
            // Optional: Redirect to support page after delay
            setTimeout(() => {
                setSent(false)
                setIsOpen(false)
                // router.push(`/sponsor/support/${ticket.id}`) // We can't easily route from here as it is a widget
            }, 3000)
        } catch (error) {
            console.error('Failed to send message:', error)
            alert('送信に失敗しました。しばらく経ってから再度お試しください。')
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-[var(--color-border)] overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="bg-[var(--color-igusa)] p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold">サポートへ問い合わせ</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>

                    <div className="p-4 bg-[var(--color-washi)]/30">
                        {sent ? (
                            <div className="text-center py-8 space-y-3">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </div>
                                <p className="font-bold text-[var(--color-text-primary)]">送信しました</p>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    お問い合わせありがとうございます。<br />
                                    「サポート」ページで回答をご確認いただけます。
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label htmlFor="message" className="text-xs font-medium text-[var(--color-text-secondary)]">
                                        お問い合わせ内容
                                    </label>
                                    <textarea
                                        id="message"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        required
                                        rows={4}
                                        placeholder="ご質問やご要望をお書きください..."
                                        className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-igusa)] resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={sending || !message.trim()}
                                    className="w-full py-2 bg-[var(--color-igusa)] text-white text-sm font-bold rounded-md hover:bg-[var(--color-igusa-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? '送信中...' : '送信する'}
                                </button>
                            </form>
                        )}
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-[var(--color-border)] text-center">
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                            通常1営業日以内に返信いたします
                        </p>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-105 ${isOpen
                        ? 'bg-gray-600 text-white rotate-90'
                        : 'bg-[var(--color-igusa)] text-white hover:bg-[var(--color-igusa-light)]'
                    }`}
            >
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                )}
            </button>
        </div>
    )
}
