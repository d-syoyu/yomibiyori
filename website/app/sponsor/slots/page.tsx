/**
 * Sponsor Slot Reservation Page
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface SlotAvailability {
  date: string
  category: string
  is_available: boolean
  reserved_by_me: boolean
  reservation_id: string | null
}

interface MyReservation {
  id: string
  date: string
  category: string
  status: 'reserved' | 'used' | 'cancelled'
  reserved_at: string
}

const CATEGORIES = ['恋愛', '季節', '日常', 'ユーモア']

export default function SponsorSlotsPage() {
  const [credits, setCredits] = useState<number>(0)
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [myReservations, setMyReservations] = useState<MyReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/sponsor-login'
        return
      }

      // Get current credits
      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('credits')
        .eq('id', session.user.id)
        .single()

      if (sponsor) {
        setCredits(sponsor.credits)
      }

      // Get slot availability (next 30 days)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/slots/availability?days_ahead=30`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSlots(data)
      }

      // Get my reservations
      const reservationsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/slots/my-reservations`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (reservationsResponse.ok) {
        const data = await reservationsResponse.json()
        setMyReservations(data)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function reserveSlot(date: string, category: string) {
    if (credits < 1) {
      setError('クレジットが不足しています')
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/sponsor-login'
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/slots/reserve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ date, category }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '予約に失敗しました')
      }

      setSuccess(`${date} の「${category}」枠を予約しました`)
      await loadData()
    } catch (err: any) {
      console.error('Reservation failed:', err)
      setError(err.message || '予約に失敗しました')
    }
  }

  async function cancelReservation(reservationId: string) {
    if (!confirm('この予約をキャンセルしますか? クレジットは返金されます。')) {
      return
    }

    setError(null)
    setSuccess(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/sponsor-login'
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/slots/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reservation_id: reservationId }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'キャンセルに失敗しました')
      }

      setSuccess('予約をキャンセルしました。クレジットが返金されました。')
      await loadData()
    } catch (err: any) {
      console.error('Cancel failed:', err)
      setError(err.message || 'キャンセルに失敗しました')
    }
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = []
    }
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, SlotAvailability[]>)

  const dates = Object.keys(slotsByDate).sort()

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
  }

  return (
    <div className="page-wrapper">
      <div className="page-container space-y-12">
        <header className="space-y-4 text-center md:text-left pt-8">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            枠予約
          </div>
          <h1 className="section-heading text-3xl md:text-4xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              お題配信枠の予約
            </span>
          </h1>
          <p className="section-subheading text-left max-w-2xl">
            クレジットを使って、お題を配信する日付とカテゴリの枠を予約できます。
          </p>
        </header>

        {/* Credit Balance */}
        <section className="card bg-[var(--color-washi)]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-[var(--color-text-secondary)]">利用可能クレジット</p>
              <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">{credits}</p>
            </div>
            {credits < 1 && (
              <a
                href="/sponsor/credits"
                className="px-6 py-2.5 bg-[var(--color-igusa)] text-white rounded-lg font-bold hover:bg-[var(--color-igusa-light)] transition-colors"
              >
                クレジットを購入
              </a>
            )}
          </div>
        </section>

        {/* Alert Messages */}
        {error && (
          <div className="bg-red-50 border border-red-600 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-600 text-green-600 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Available Slots Calendar */}
        <section className="card space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span className="text-2xl">📅</span> 空き枠カレンダー
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              緑色の枠は予約可能、青色は予約済み、灰色は他のスポンサーが予約済みです
            </p>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {dates.map((date) => {
              const dateSlots = slotsByDate[date]
              const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })

              return (
                <div key={date} className="border border-[var(--color-border)] rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-[var(--color-text-primary)]">{formattedDate}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CATEGORIES.map((category) => {
                      const slot = dateSlots.find((s) => s.category === category)
                      const isAvailable = slot?.is_available ?? true
                      const reservedByMe = slot?.reserved_by_me ?? false

                      return (
                        <button
                          key={category}
                          onClick={() => isAvailable && !reservedByMe && reserveSlot(date, category)}
                          disabled={!isAvailable || reservedByMe || credits < 1}
                          className={`
                            px-4 py-3 rounded-lg font-medium text-sm transition-colors
                            ${reservedByMe
                              ? 'bg-blue-100 border-2 border-blue-600 text-blue-600 cursor-default'
                              : isAvailable
                              ? 'bg-green-50 border-2 border-green-600 text-green-600 hover:bg-green-100 cursor-pointer'
                              : 'bg-gray-100 border-2 border-gray-300 text-gray-400 cursor-not-allowed'
                            }
                            ${credits < 1 && isAvailable && !reservedByMe ? 'opacity-50' : ''}
                          `}
                        >
                          {reservedByMe && '✅ '}
                          {category}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* My Reservations */}
        <section className="card space-y-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-2xl">📋</span> 予約済み枠
          </h2>

          {myReservations.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
              まだ予約がありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">日付</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">カテゴリ</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">ステータス</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">予約日時</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {myReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-washi)] transition-colors">
                      <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                        {new Date(reservation.date + 'T00:00:00').toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text-primary)] font-medium">
                        {reservation.category}
                      </td>
                      <td className="py-3 px-4">
                        {reservation.status === 'reserved' && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full border bg-green-50 border-green-600 text-green-600">
                            予約中
                          </span>
                        )}
                        {reservation.status === 'used' && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full border bg-blue-50 border-blue-600 text-blue-600">
                            使用済み
                          </span>
                        )}
                        {reservation.status === 'cancelled' && (
                          <span className="text-xs font-medium px-2 py-1 rounded-full border bg-gray-50 border-gray-600 text-gray-600">
                            キャンセル
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">
                        {new Date(reservation.reserved_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {reservation.status === 'reserved' && (
                          <button
                            onClick={() => cancelReservation(reservation.id)}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            キャンセル
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card bg-[var(--color-washi)] space-y-3">
          <p className="font-bold text-[var(--color-text-primary)]">💡 枠予約について</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-[var(--color-text-secondary)]">
            <li>予約は先着順です。人気の日付はお早めにご予約ください</li>
            <li>予約した枠でお題を作成・投稿できます</li>
            <li>お題が却下された場合、クレジットは自動的に返金されます</li>
            <li>予約は配信日の前日までキャンセル可能です</li>
            <li>使用済みの枠はキャンセルできません</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
