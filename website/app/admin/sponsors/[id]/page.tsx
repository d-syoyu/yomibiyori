'use client'

import { use, useCallback, useEffect, useState } from 'react'
import {
  adjustSponsorCredits,
  CreditTransaction,
  fetchSponsorCreditTransactions,
  refundStripePayment,
} from '@/lib/adminApi'
import { useToast } from '@/lib/hooks/useToast'
import Link from 'next/link'
import { Loading } from '@/components/ui/Spinner'

export default function AdminSponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const toast = useToast()
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
      toast.warning('調整額を入力してください')
      return
    }
    if (!adjustDescription.trim()) {
      toast.warning('調整理由を入力してください')
      return
    }

    setAdjusting(true)
    try {
      await adjustSponsorCredits(id, adjustAmount, adjustDescription)
      setAdjustAmount(0)
      setAdjustDescription('')
      setRefreshKey((v) => v + 1)
      toast.success('クレジットを調整しました')
    } catch (err) {
      console.error('Failed to adjust credits:', err)
      toast.error(err instanceof Error ? err.message : 'クレジット調整に失敗しました')
    } finally {
      setAdjusting(false)
    }
  }

  async function handleRefund() {
    if (!refundPaymentIntentId.trim()) {
      toast.warning('Payment Intent IDを入力してください')
      return
    }
    if (refundAmountCredits <= 0) {
      toast.warning('返金クレジット数を入力してください')
      return
    }
    if (!refundReason.trim()) {
      toast.warning('返金理由を入力してください')
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
      toast.success(result.message)
      setRefundPaymentIntentId('')
      setRefundAmountCredits(0)
      setRefundReason('')
      setRefreshKey((v) => v + 1)
    } catch (err) {
      console.error('Failed to refund payment:', err)
      toast.error(err instanceof Error ? err.message : '返金処理に失敗しました')
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
    return <Loading />
  }

  if (error || !sponsor) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/sponsors"
          className="inline-flex items-center gap-1 text-[var(--color-igusa)] hover:text-[var(--color-igusa-light)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          スポンサー一覧に戻る
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
          className="inline-flex items-center gap-1 text-[var(--color-igusa)] hover:text-[var(--color-igusa-light)] mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          スポンサー一覧に戻る
        </Link>
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            クレジット管理
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            {sponsor.company_name}
          </h1>
          <p className="text-[var(--color-text-secondary)]">取引履歴とクレジット調整</p>
        </div>
      </div>

      {/* Current Credits */}
      <div className="card border-2 border-[var(--color-igusa)]/20 bg-gradient-to-br from-[var(--color-washi)] to-white">
        <p className="text-sm font-medium text-[var(--color-text-secondary)]">現在のクレジット残高</p>
        <p className="text-5xl font-bold font-serif text-[var(--color-text-primary)] mt-2">
          {sponsor.current_credits}
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">1クレジット = お題1件の投稿</p>
      </div>

      {/* Adjust Credits */}
      <div className="card space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">クレジット調整</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              調整額（正の数で追加、負の数で減少）
            </label>
            <input
              type="number"
              id="amount"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
              disabled={adjusting}
              placeholder="例: 10 (追加) または -5 (減少)"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              調整理由
            </label>
            <textarea
              id="description"
              value={adjustDescription}
              onChange={(e) => setAdjustDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]"
              disabled={adjusting}
              rows={3}
              placeholder="調整の理由を入力してください"
            />
          </div>
          <button
            onClick={handleAdjust}
            disabled={adjusting || adjustAmount === 0 || !adjustDescription.trim()}
            className="w-full px-6 py-3 bg-[var(--color-igusa)] text-white rounded-xl font-bold hover:bg-[var(--color-igusa-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adjusting ? '処理中...' : 'クレジットを調整'}
          </button>
        </div>
      </div>

      {/* Stripe Refund */}
      <div className="card border border-red-100 space-y-4">
        <h2 className="text-xl font-bold text-red-900">Stripe返金処理</h2>
        <p className="text-sm text-red-700">
          この操作はStripeで実際の返金を実行し、クレジットを減算します。元に戻すことはできません。
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="paymentIntentId" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Payment Intent ID
            </label>
            <input
              type="text"
              id="paymentIntentId"
              value={refundPaymentIntentId}
              onChange={(e) => setRefundPaymentIntentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={refunding}
              placeholder="pi_xxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              取引履歴からPayment Intent IDをコピーしてください
            </p>
          </div>
          <div>
            <label htmlFor="refundCredits" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              返金クレジット数
            </label>
            <input
              type="number"
              id="refundCredits"
              value={refundAmountCredits}
              onChange={(e) => setRefundAmountCredits(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={refunding}
              placeholder="例: 10"
              min="1"
            />
          </div>
          <div>
            <label htmlFor="refundReason" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              返金理由
            </label>
            <textarea
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-red-500"
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
      <div className="card space-y-4">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">取引履歴（{total}件）</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
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
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">Payment Intent ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-secondary)]">詳細</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-washi)]/50 transition-colors">
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
                    <td className="py-3 px-4 text-xs font-mono text-[var(--color-text-muted)]">
                      {transaction.stripe_payment_intent_id ? (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(transaction.stripe_payment_intent_id!)
                            toast.info('Payment Intent IDをコピーしました')
                          }}
                          className="hover:text-[var(--color-igusa)] underline"
                          title="クリックしてコピー"
                        >
                          {transaction.stripe_payment_intent_id}
                        </button>
                      ) : (
                        '—'
                      )}
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
      </div>
    </div>
  )
}
