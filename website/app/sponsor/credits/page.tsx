/**
 * Sponsor Credits Purchase Page
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSponsorAuth } from '@/lib/hooks/useSponsorAuth'
import {
  getTransactionTypeLabel,
  getTransactionTypeClassName,
} from '@/lib/constants'
import type { CreditTransaction } from '@/types/sponsor'
import { Loading } from '@/components/ui/Spinner'

interface Pricing {
  quantity: number
  free_credits: number
  paid_credits: number
  unit_price: number
  subtotal: number
  total: number
  discount_amount: number
  discount_percent: number
}

// Calculate bulk discount locally (same logic as backend)
function calculateBulkDiscount(quantity: number, unitPrice: number = 11000): Pricing {
  const freeCredits = Math.floor(quantity / 4)
  const paidCredits = quantity - freeCredits
  const subtotal = quantity * unitPrice
  const total = paidCredits * unitPrice
  const discountAmount = subtotal - total
  return {
    quantity,
    free_credits: freeCredits,
    paid_credits: paidCredits,
    unit_price: unitPrice,
    subtotal,
    total,
    discount_amount: discountAmount,
    discount_percent: subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0,
  }
}

export default function SponsorCreditsPage() {
  const { sponsorId, isImpersonating, accessToken, loading: authLoading } = useSponsorAuth()
  const [credits, setCredits] = useState<number>(0)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [purchaseQuantity, setPurchaseQuantity] = useState(4) // Default to 4 to show discount
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pricing = calculateBulkDiscount(purchaseQuantity)

  const loadCreditsAndTransactions = useCallback(async () => {
    if (!sponsorId) {
      window.location.href = '/sponsor-login'
      return
    }

    try {
      // Get current credits from sponsors table
      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('credits')
        .eq('id', sponsorId)
        .single()

      if (sponsor) {
        setCredits(sponsor.credits)
      }

      // Get transaction history from backend API (only if access token exists)
      if (accessToken) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/credits/transactions`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setTransactions(data)
        }
      }
    } catch (err) {
      console.error('Failed to load credits:', err)
    } finally {
      setLoading(false)
    }
  }, [sponsorId, accessToken])

  useEffect(() => {
    if (!authLoading) {
      loadCreditsAndTransactions()
    }
  }, [authLoading, loadCreditsAndTransactions])

  async function handlePurchase() {
    if (purchaseQuantity < 1 || purchaseQuantity > 100) {
      setError('購入数量は1〜100の範囲で指定してください')
      return
    }

    setPurchasing(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/sponsor-login'
        return
      }

      // Create Stripe checkout session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/credit-purchase/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          quantity: purchaseQuantity,
          success_url: `${window.location.origin}/sponsor/credits?success=true`,
          cancel_url: `${window.location.origin}/sponsor/credits?canceled=true`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || '購入セッションの作成に失敗しました')
      }

      const { url } = await response.json()

      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (err) {
      console.error('Purchase failed:', err)
      setError(err instanceof Error ? err.message : '購入処理に失敗しました')
      setPurchasing(false)
    }
  }

  if (loading || authLoading) {
    return <Loading />
  }

  return (
    <div className="page-wrapper">
      <div className="page-container space-y-12">
        <header className="space-y-4 text-center md:text-left pt-8">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            クレジット管理
          </div>
          <h1 className="section-heading text-3xl md:text-4xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              クレジット購入
            </span>
          </h1>
          <p className="section-subheading text-left max-w-2xl">
            クレジットを購入して、オリジナルのお題を投稿できます。1クレジット = お題1件の投稿です。
          </p>
        </header>

        {/* Credit Balance Card */}
        <section className="card border-2 border-[var(--color-igusa)] bg-gradient-to-br from-[var(--color-washi)] to-white p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-igusa)]">利用可能クレジット</p>
              <p className="text-6xl font-bold font-serif text-[var(--color-igusa)]">{credits}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">1クレジット = お題1件の投稿</p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="/sponsor/themes/new"
                className="px-8 py-3 bg-[var(--color-igusa)] text-white rounded-lg font-bold text-center hover:bg-[var(--color-igusa-light)] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg> お題を投稿
              </a>
              <p className="text-xs text-center text-[var(--color-text-secondary)]">
                クレジットを消費してお題を投稿
              </p>
            </div>
          </div>
        </section>

        {/* Purchase Section */}
        <section className="card space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-igusa)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg> クレジットを購入
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              1クレジット = ¥11,000 (税込)
            </p>
          </div>

          {/* Bulk Discount Banner */}
          <div className="rounded-lg border-2 border-[var(--color-igusa)]/30 bg-[var(--color-igusa)]/5 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-igusa)]/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-[var(--color-igusa)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-[var(--color-igusa)]">1日分まとめ買いで1クレジットプレゼント</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  4クレジット（全4カテゴリー）購入ごとに1クレジットプレゼント
                </p>
              </div>
              <div className="hidden sm:block">
                <span className="inline-flex items-center rounded-full bg-[var(--color-igusa)] px-3 py-1 text-sm font-bold text-white">
                  25%OFF
                </span>
              </div>
            </div>
          </div>

          {isImpersonating && (
            <div className="bg-purple-50 border border-purple-300 text-purple-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              なりすましモード中は購入機能を利用できません
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-600 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!isImpersonating && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--color-text-primary)]">
                  購入数量を選択
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { qty: 4, days: 1, free: 1 },
                    { qty: 8, days: 2, free: 2 },
                    { qty: 12, days: 3, free: 3 },
                    { qty: 20, days: 5, free: 5 },
                  ].map(({ qty, days, free }) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setPurchaseQuantity(qty)}
                      className={`relative p-3 rounded-lg border transition-all ${
                        purchaseQuantity === qty
                          ? 'bg-[var(--color-washi)] border-[var(--color-igusa)] ring-1 ring-[var(--color-igusa)]'
                          : 'bg-white border-[var(--color-border)] hover:border-[var(--color-igusa)]/50'
                      }`}
                      disabled={purchasing}
                    >
                      {free > 0 && (
                        <span className="absolute -top-2 -right-2 bg-[var(--color-igusa)] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          +{free}
                        </span>
                      )}
                      <div className="text-xl font-bold text-[var(--color-text-primary)]">{qty}</div>
                      <div className="text-xs text-[var(--color-text-secondary)]">{days}日分</div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-text-secondary)]">個別に指定:</span>
                  <input
                    type="number"
                    id="quantity"
                    min="1"
                    max="100"
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-20 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)] text-center font-bold"
                    disabled={purchasing}
                  />
                  <span className="text-sm text-[var(--color-text-secondary)]">クレジット</span>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-washi)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">獲得クレジット</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{pricing.quantity}<span className="text-base font-normal ml-1">クレジット</span></p>
                  </div>
                  {pricing.free_credits > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-[var(--color-text-secondary)]">プレゼント分</span>
                      <p className="text-[var(--color-igusa)] font-bold">+{pricing.free_credits}</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
                  {pricing.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--color-text-secondary)]">通常価格</span>
                      <span className="text-[var(--color-text-secondary)] line-through">¥{pricing.subtotal.toLocaleString()}</span>
                    </div>
                  )}
                  {pricing.discount_amount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[var(--color-igusa)]">割引額（{pricing.discount_percent}%OFF）</span>
                      <span className="text-[var(--color-igusa)] font-bold">-¥{pricing.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[var(--color-text-primary)] font-bold">お支払い金額</span>
                    <span className="text-2xl font-bold text-[var(--color-igusa)]">¥{pricing.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full px-8 py-3 bg-[var(--color-igusa)] text-white rounded-lg font-bold hover:bg-[var(--color-igusa-light)] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {purchasing ? '処理中...' : (
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    購入手続きへ
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="bg-[var(--color-washi)] p-4 rounded-lg space-y-2 text-sm">
            <p className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              購入について
            </p>
            <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
              <li><strong>1日分 = 4クレジット：</strong>全4カテゴリーにお題を投稿できます</li>
              <li><strong>まとめ買い特典：</strong>1日分（4クレジット）購入ごとに1クレジットプレゼント</li>
              <li>お支払いはStripeの安全な決済システムを利用します</li>
              <li>クレジットカードまたは銀行振込でのお支払いが可能です</li>
              <li>カード決済は購入後すぐにクレジットが反映されます</li>
              <li>銀行振込は入金確認後にクレジットが反映されます（通常1〜2営業日）</li>
              <li>お題投稿時に1クレジット自動消費、却下時は自動返金されます</li>
            </ul>
          </div>
        </section>

        {/* Transaction History */}
        <section className="card space-y-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-[var(--color-igusa)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
            </svg> 取引履歴
          </h2>

          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
              まだ取引履歴がありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">日時</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">種類</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">増減</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-washi)] transition-colors">
                      <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                        {new Date(transaction.created_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getTransactionTypeClassName(transaction.transaction_type)}`}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-sm font-bold text-right ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">
                        {transaction.description || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
