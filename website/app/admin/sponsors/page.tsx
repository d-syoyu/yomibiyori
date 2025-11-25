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
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-[var(--color-washi)] px-4 py-1.5 text-sm font-medium tracking-wider text-[var(--color-igusa)] border border-[var(--color-washi-dark)]">
            スポンサー管理
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
              スポンサー管理
            </span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">{filteredSummary}（{total}件）</p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-[var(--color-igusa)] text-white'
                  : 'bg-white text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-igusa)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input
          type="search"
          value={searchDraft}
          placeholder="企業名やメールアドレスで検索"
          onChange={(event) => setSearchDraft(event.target.value)}
          className="w-full md:w-96 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm focus:border-[var(--color-igusa)] focus:outline-none focus:ring-2 focus:ring-[var(--color-igusa)]/20"
        />
        <button
          onClick={() => setRefreshKey((value) => value + 1)}
          className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-igusa)] flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          再読み込み
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sponsors.length === 0 && (
            <div className="card p-8 text-center text-[var(--color-text-secondary)] border-dashed">
              該当するスポンサーが見つかりませんでした
            </div>
          )}

          {sponsors.map((sponsor) => (
            <div key={sponsor.id} className="card">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {sponsor.company_name}
                  </h3>
                  <div className="mt-2 text-sm text-[var(--color-text-secondary)] space-y-1">
                    <p>メール: {sponsor.contact_email || '未登録'}</p>
                    {sponsor.official_url && (
                      <p className="truncate">
                        URL: <a href={sponsor.official_url} target="_blank" rel="noreferrer" className="text-[var(--color-igusa)] underline">
                          {sponsor.official_url}
                        </a>
                      </p>
                    )}
                    <p>プラン: {sponsor.plan_tier}</p>
                    <p className="font-bold text-[var(--color-text-primary)] flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-[var(--color-igusa)]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                      </svg>
                      クレジット残高: {sponsor.credits}
                    </p>
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
                  <a
                    href={`/admin/sponsors/${sponsor.id}`}
                    className="rounded-xl px-4 py-2 text-sm font-medium bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-igusa)] transition-colors text-center"
                  >
                    クレジット管理
                  </a>
                  <button
                    onClick={() => handleVerificationToggle(sponsor)}
                    disabled={processingId === sponsor.id}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                      sponsor.verified
                        ? 'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-igusa)]'
                        : 'bg-[var(--color-igusa)] text-white hover:bg-[var(--color-igusa-light)]'
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
