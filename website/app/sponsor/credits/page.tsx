/**
 * Sponsor Credits Purchase Page
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Transaction {
  id: string
  amount: number
  transaction_type: 'purchase' | 'use' | 'refund' | 'admin_adjustment'
  description: string | null
  created_at: string
}

export default function SponsorCreditsPage() {
  const [credits, setCredits] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [purchaseQuantity, setPurchaseQuantity] = useState(1)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCreditsAndTransactions()
  }, [])

  async function loadCreditsAndTransactions() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/sponsor-login'
        return
      }

      // Get current credits from sponsors table
      const { data: sponsor } = await supabase
        .from('sponsors')
        .select('credits')
        .eq('id', session.user.id)
        .single()

      if (sponsor) {
        setCredits(sponsor.credits)
      }

      // Get transaction history from backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sponsor/credits/transactions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      }
    } catch (err) {
      console.error('Failed to load credits:', err)
    } finally {
      setLoading(false)
    }
  }

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
    } catch (err: any) {
      console.error('Purchase failed:', err)
      setError(err.message || '購入処理に失敗しました')
      setPurchasing(false)
    }
  }

  const transactionTypeLabels: Record<string, string> = {
    purchase: '購入',
    use: '使用',
    refund: '返金',
    admin_adjustment: '管理者調整',
  }

  const transactionTypeColors: Record<string, string> = {
    purchase: 'text-green-600 bg-green-50 border-green-600',
    use: 'text-blue-600 bg-blue-50 border-blue-600',
    refund: 'text-orange-600 bg-orange-50 border-orange-600',
    admin_adjustment: 'text-purple-600 bg-purple-50 border-purple-600',
  }

  if (loading) {
    return <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
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
                ✨ お題を投稿
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
              <span className="text-2xl">💳</span> クレジットを購入
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              1クレジット = ¥10,000 (税込)
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-600 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="quantity" className="block text-sm font-medium text-[var(--color-text-primary)]">
                購入数量
              </label>
              <input
                type="number"
                id="quantity"
                min="1"
                max="100"
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
                disabled={purchasing}
              />
              <p className="text-sm font-bold text-[var(--color-text-primary)]">
                合計: ¥{(purchaseQuantity * 10000).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full px-8 py-3 bg-[var(--color-igusa)] text-white rounded-lg font-bold hover:bg-[var(--color-igusa-light)] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {purchasing ? '処理中...' : '💳 Stripeで購入'}
            </button>
          </div>

          <div className="bg-[var(--color-washi)] p-4 rounded-lg space-y-2 text-sm">
            <p className="font-bold text-[var(--color-text-primary)]">💡 購入について</p>
            <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
              <li>お支払いはStripeの安全な決済システムを利用します</li>
              <li>クレジットカードでのお支払いが可能です</li>
              <li>購入後すぐにクレジットが反映されます</li>
              <li>お題投稿時に1クレジット自動消費、却下時は自動返金されます</li>
            </ul>
          </div>
        </section>

        {/* Transaction History */}
        <section className="card space-y-6">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-2xl">📊</span> 取引履歴
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
                        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${transactionTypeColors[transaction.transaction_type]}`}>
                          {transactionTypeLabels[transaction.transaction_type]}
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
