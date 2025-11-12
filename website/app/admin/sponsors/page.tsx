'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AdminSponsor,
  fetchSponsorList,
  updateSponsorVerification,
} from '@/lib/adminApi'

type FilterValue = 'all' | 'verified' | 'pending'

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: '全て', value: 'all' },
  { label: '承認済み', value: 'verified' },
  { label: '審査待ち', value: 'pending' },
]

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('ja-JP')
  } catch (error) {
    return value
  }
}

export default function AdminSponsorsPage() {
  const [sponsors, setSponsors] = useState<AdminSponsor[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<FilterValue>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchDraft])

  const loadSponsors = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchSponsorList({
        verified:
          filter === 'all' ? undefined : filter === 'verified' ? true : false,
        search: search || undefined,
        limit: 100,
      })
      setSponsors(response.sponsors)
      setTotal(response.total)
    } catch (err) {
      console.error('Failed to load sponsors:', err)
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
      setSponsors([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [filter, search, refreshKey])

  useEffect(() => {
    loadSponsors()
  }, [loadSponsors])

  const filteredSummary = useMemo(() => {
    switch (filter) {
      case 'verified':
        return '承認済みのスポンサー一覧'
      case 'pending':
        return '審査待ちのスポンサー一覧'
      default:
        return '全スポンサー一覧'
    }
  }, [filter])

  async function handleVerificationToggle(sponsor: AdminSponsor) {
    if (processingId) return
    setProcessingId(sponsor.id)
    try {
      await updateSponsorVerification(sponsor.id, !sponsor.verified)
      setSponsors((prev) =>
        prev.map((item) =>
          item.id === sponsor.id ? { ...item, verified: !item.verified } : item,
        ),
      )
    } catch (err) {
      console.error('Failed to update verification:', err)
      alert(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setProcessingId(null)
      setRefreshKey((value) => value + 1)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-900">スポンサー承認</h1>
          <p className="text-amber-700">{filteredSummary}（{total}件）</p>
        </div>
        <div className="flex gap-3">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-amber-800 border-amber-200 hover:border-amber-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="search"
            value={searchDraft}
            placeholder="企業名やメールアドレスで検索"
            onChange={(event) => setSearchDraft(event.target.value)}
            className="w-full md:w-96 rounded-xl border border-amber-200 bg-white/80 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setRefreshKey((value) => value + 1)}
              className="rounded-xl border border-amber-200 bg-white/80 px-4 py-2 text-sm text-amber-800 hover:border-amber-400"
            >
              再読み込み
            </button>
          </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-amber-900">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sponsors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-white/60 p-8 text-center text-amber-800">
              該当するスポンサーが見つかりませんでした
            </div>
          )}

          {sponsors.map((sponsor) => (
            <div
              key={sponsor.id}
              className="rounded-2xl border border-amber-100 bg-white/80 p-6 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-amber-900">
                    {sponsor.company_name}
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>メール: {sponsor.contact_email || '未登録'}</p>
                    {sponsor.official_url && (
                      <p className="truncate">
                        URL: <a href={sponsor.official_url} target="_blank" rel="noreferrer" className="text-amber-600 underline">
                          {sponsor.official_url}
                        </a>
                      </p>
                    )}
                    <p>プラン: {sponsor.plan_tier}</p>
                    <p>登録日: {formatDate(sponsor.created_at)}</p>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      sponsor.verified
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    }`}
                  >
                    {sponsor.verified ? '承認済み' : '審査待ち'}
                  </span>
                  <button
                    onClick={() => handleVerificationToggle(sponsor)}
                    disabled={processingId === sponsor.id}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      sponsor.verified
                        ? 'bg-white text-amber-900 border border-amber-200 hover:border-amber-400'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    } ${processingId === sponsor.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {sponsor.verified ? '承認を解除' : '承認する'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
