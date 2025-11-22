'use client'

import { use, useCallback, useEffect, useState } from 'react'
import {
  adjustSponsorCredits,
  CreditTransaction,
  fetchSponsorCreditTransactions,
  refundStripePayment,
} from '@/lib/adminApi'
import Link from 'next/link'

export default function AdminSponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [sponsor, setSponsor] = useState<{
    id: string
    company_name: string
    current_credits: number
  } | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustAmount, setAdjustAmount] = useState<number>(0)
  const [adjustDescription, setAdjustDescription] = useState<string>('')
  const [adjusting, setAdjusting] = useState(false)
  const [refundPaymentIntentId, setRefundPaymentIntentId] = useState<string>('')
  const [refundAmountCredits, setRefundAmountCredits] = useState<number>(0)
  const [refundReason, setRefundReason] = useState<string>('')
  const [refunding, setRefunding] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchSponsorCreditTransactions(id, { limit: 100 })
      setSponsor(response.sponsor)
      setTransactions(response.transactions)
      setTotal(response.total)
    } catch (err) {
      console.error('Failed to load credit transactions:', err)
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [id, refreshKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAdjust() {
    if (adjustAmount === 0) {
      alert('調整額を入力してください')
      return
    }
    if (!adjustDescription.trim()) {
      alert('調整理由を入力してください')
      return
    }

    setAdjusting(true)
    try {
      await adjustSponsorCredits(id, adjustAmount, adjustDescription)
      setAdjustAmount(0)
      setAdjustDescription('')
      setRefreshKey((v) => v + 1)
    } catch (err) {
      console.error('Failed to adjust credits:', err)
      alert(err instanceof Error ? err.message : 'クレジット調整に失敗しました')
    } finally {
      setAdjusting(false)
    }
  }

  async function handleRefund() {
    if (!refundPaymentIntentId.trim()) {
      alert('Payment Intent IDを入力してください')
      return
    }
    if (refundAmountCredits <= 0) {
      alert('返金クレジット数を入力してください')
      return
    }
    if (!refundReason.trim()) {
      alert('返金理由を入力してください')
      return
    }

    if (!confirm(`${refundAmountCredits}クレジットを返金します。よろしいですか？`)) {
      return
    }

    setRefunding(true)
    try {
      const result = await refundStripePayment(
        id,
        refundPaymentIntentId,
        refundAmountCredits,
        refundReason
      )
      alert(result.message)
      setRefundPaymentIntentId('')
      setRefundAmountCredits(0)
      setRefundReason('')
      setRefreshKey((v) => v + 1)
    } catch (err) {
      console.error('Failed to refund payment:', err)
      alert(err instanceof Error ? err.message : '返金処理に失敗しました')
    } finally {
      setRefunding(false)
    }
  }

  const transactionTypeLabels: Record<string, string> = {
    purchase: '購入',
    use: '使用',
    refund: '返金',
    admin_adjustment: '管理者調整',
  }

  const transactionTypeColors: Record<string, string> = {
    purchase: 'text-green-700 bg-green-50 border-green-200',
    use: 'text-blue-700 bg-blue-50 border-blue-200',
    refund: 'text-orange-700 bg-orange-50 border-orange-200',
    admin_adjustment: 'text-purple-700 bg-purple-50 border-purple-200',
  }

  if (loading) {
    return <div className="text-amber-900">読み込み中...</div>
  }

  if (error || !sponsor) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/sponsors"
          className="inline-block text-amber-600 hover:text-amber-800"
        >
          ← スポンサー一覧に戻る
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'スポンサー情報が見つかりません'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/sponsors"
          className="inline-block text-amber-600 hover:text-amber-800 mb-4"
        >
          ← スポンサー一覧に戻る
        </Link>
        <h1 className="text-3xl font-bold text-amber-900">
          {sponsor.company_name} - クレジット管理
        </h1>
        <p className="text-amber-700">取引履歴とクレジット調整</p>
      </div>

      {/* Current Credits */}
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
        <p className="text-sm font-medium text-amber-700">現在のクレジット残高</p>
        <p className="text-5xl font-bold font-serif text-amber-900 mt-2">
          {sponsor.current_credits}
        </p>
        <p className="text-sm text-amber-600 mt-1">1クレジット = お題1件の投稿</p>
      </div>

      {/* Adjust Credits */}
      <div className="rounded-2xl border border-amber-100 bg-white/80 p-6 space-y-4">
        <h2 className="text-xl font-bold text-amber-900">クレジット調整</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-amber-900 mb-2">
              調整額（正の数で追加、負の数で減少）
            </label>
            <input
              type="number"
              id="amount"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={adjusting}
              placeholder="例: 10 (追加) または -5 (減少)"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-amber-900 mb-2">
              調整理由
            </label>
            <textarea
              id="description"
              value={adjustDescription}
              onChange={(e) => setAdjustDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={adjusting}
              rows={3}
              placeholder="調整の理由を入力してください"
            />
          </div>
          <button
            onClick={handleAdjust}
            disabled={adjusting || adjustAmount === 0 || !adjustDescription.trim()}
            className="w-full px-6 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adjusting ? '処理中...' : 'クレジットを調整'}
          </button>
        </div>
      </div>

      {/* Stripe Refund */}
      <div className="rounded-2xl border border-red-100 bg-white/80 p-6 space-y-4">
        <h2 className="text-xl font-bold text-red-900">Stripe返金処理</h2>
        <p className="text-sm text-red-700">
          ⚠️ この操作はStripeで実際の返金を実行し、クレジットを減算します。元に戻すことはできません。
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="paymentIntentId" className="block text-sm font-medium text-amber-900 mb-2">
              Payment Intent ID
            </label>
            <input
              type="text"
              id="paymentIntentId"
              value={refundPaymentIntentId}
              onChange={(e) => setRefundPaymentIntentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={refunding}
              placeholder="pi_xxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-amber-600 mt-1">
              取引履歴からPayment Intent IDをコピーしてください
            </p>
          </div>
          <div>
            <label htmlFor="refundCredits" className="block text-sm font-medium text-amber-900 mb-2">
              返金クレジット数
            </label>
            <input
              type="number"
              id="refundCredits"
              value={refundAmountCredits}
              onChange={(e) => setRefundAmountCredits(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={refunding}
              placeholder="例: 10"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="refundReason" className="block text-sm font-medium text-amber-900 mb-2">
              返金理由
            </label>
            <textarea
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={refunding}
              rows={3}
              placeholder="返金の理由を詳しく入力してください"
            />
          </div>
          <button
            onClick={handleRefund}
            disabled={
              refunding ||
              !refundPaymentIntentId.trim() ||
              refundAmountCredits <= 0 ||
              !refundReason.trim()
            }
            className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refunding ? '処理中...' : 'Stripe返金を実行'}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-amber-100 bg-white/80 p-6 space-y-4">
        <h2 className="text-xl font-bold text-amber-900">取引履歴（{total}件）</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-amber-700 text-center py-8">
            まだ取引履歴がありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-amber-700">日時</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-amber-700">種類</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-amber-700">増減</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-amber-700">Payment Intent ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-amber-700">詳細</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-amber-100 hover:bg-amber-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-amber-900">
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
                    <td className="py-3 px-4 text-xs font-mono text-amber-600">
                      {transaction.stripe_payment_intent_id ? (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(transaction.stripe_payment_intent_id!)
                            alert('Payment Intent IDをコピーしました')
                          }}
                          className="hover:text-amber-800 underline"
                          title="クリックしてコピー"
                        >
                          {transaction.stripe_payment_intent_id}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-amber-700">
                      {transaction.description || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
