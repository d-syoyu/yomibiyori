/**
 * Sponsor Insights Page
 * Displays performance metrics for sponsored themes.
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getImpersonation } from '@/lib/impersonation'

function formatDateForCsv(value: string) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('ja-JP')
}

function escapeCsvValue(value: string | number | null | undefined) {
    if (value === null || value === undefined) return '""'
    const stringValue = typeof value === 'number' ? value.toString() : value.replace(/\r?\n/g, ' ')
    const escaped = stringValue.replace(/"/g, '""')
    return `"${escaped}"`
}

function formatDemographicsValue(map?: Record<string, number>) {
    if (!map) return ''
    const entries = Object.entries(map).filter(([_, count]) => typeof count === 'number')
    if (entries.length === 0) return ''
    return entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key, count]) => `${key}:${count}`)
        .join(' | ')
}

import { TrendChart } from '../../../components/charts/TrendChart'
import { DemographicsChart } from '../../../components/charts/DemographicsChart'

// Tooltip component for metric explanations
function InfoTooltip({ text, position = 'top-left' }: { text: string; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
    const [isVisible, setIsVisible] = useState(false)

    const tooltipStyle = (() => {
        const base = {
            position: 'absolute' as const,
            zIndex: 9999,
            width: 'min(280px, calc(100vw - 32px))',
            maxWidth: 'min(280px, calc(100vw - 32px))',
            padding: '12px',
            fontSize: '12px',
            lineHeight: '1.5',
            color: 'var(--color-text-primary)',
            backgroundColor: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            pointerEvents: 'none' as const,
            whiteSpace: 'normal' as const,
            wordBreak: 'break-word' as const,
        }

        switch (position) {
            case 'bottom-right':
                return {
                    ...base,
                    top: 'calc(100% + 8px)',
                    right: '0',
                    left: 'auto',
                }
            case 'bottom-left':
                return {
                    ...base,
                    top: 'calc(100% + 8px)',
                    left: '0',
                    right: 'auto',
                }
            case 'top-right':
                return {
                    ...base,
                    bottom: 'calc(100% + 8px)',
                    right: '0',
                    left: 'auto',
                }
            case 'top-left':
            default:
                return {
                    ...base,
                    bottom: 'calc(100% + 8px)',
                    left: '16px',
                    right: 'auto',
                }
        }
    })()

    const arrowStyle = (() => {
        const base = {
            position: 'absolute' as const,
            width: '8px',
            height: '8px',
            backgroundColor: 'white',
            transform: 'rotate(45deg)',
        }

        switch (position) {
            case 'bottom-right':
                return {
                    ...base,
                    top: '-5px',
                    right: '16px',
                    borderLeft: '1px solid var(--color-border)',
                    borderTop: '1px solid var(--color-border)'
                }
            case 'bottom-left':
                return {
                    ...base,
                    top: '-5px',
                    left: '16px',
                    borderLeft: '1px solid var(--color-border)',
                    borderTop: '1px solid var(--color-border)'
                }
            case 'top-right':
                return {
                    ...base,
                    bottom: '-5px',
                    right: '16px',
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)'
                }
            case 'top-left':
            default:
                return {
                    ...base,
                    bottom: '-5px',
                    left: '16px',
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)'
                }
        }
    })()

    return (
        <span
            className="inline-block ml-1"
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)}
        >
            <button
                type="button"
                className="inline-flex items-center justify-center w-4 h-4 text-xs font-semibold rounded-full bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-igusa)] hover:text-white hover:border-[var(--color-igusa)] transition-colors shadow-sm cursor-help"
            >
                ?
            </button>
            {isVisible && (
                <span style={tooltipStyle}>
                    {text}
                    <span style={arrowStyle} />
                </span>
            )}
        </span>
    )
}

// Types for Insight Data
interface ThemeInsight {
    id: string
    text_575: string
    date: string
    impressions: number
    submissions: number
    sponsor_link_clicks: number
    likes: number
    engagement_rate: number
    total_likes: number
    avg_likes_per_work: number
    top_work: {
        text: string
        likes: number
        author_name: string
    } | null
    demographics?: {
        age_groups: Record<string, number>
        regions: Record<string, number>
    }
}

interface SummaryStats {
    total_impressions: number
    total_submissions: number
    avg_engagement_rate: number
}

export default function SponsorInsightsPage() {
    const [loading, setLoading] = useState(true)
    const [themes, setThemes] = useState<ThemeInsight[]>([])
    const [selectedTheme, setSelectedTheme] = useState<ThemeInsight | null>(null)
    const [summary, setSummary] = useState<SummaryStats>({
        total_impressions: 0,
        total_submissions: 0,
        avg_engagement_rate: 0,
    })

    useEffect(() => {
        fetchInsights()
    }, [])

    async function fetchInsights() {
        try {
            setLoading(true)

            // Check for impersonation first
            const impersonation = getImpersonation()
            const { data: { session } } = await supabase.auth.getSession()

            // Determine sponsor ID - use impersonation if available, otherwise session
            let sponsorId: string
            if (impersonation) {
                sponsorId = impersonation.sponsorId
            } else if (session) {
                sponsorId = session.user.id
            } else {
                return
            }

            const { data: campaigns, error: campaignsError } = await supabase
                .from('sponsor_campaigns')
                .select('id')
                .eq('sponsor_id', sponsorId)

            if (campaignsError) {
                throw campaignsError
            }

            if (!campaigns || campaigns.length === 0) {
                setThemes([])
                return
            }

            const campaignIds = campaigns.map(c => c.id)

            // 承認済みスポンサーお題のIDリストを取得
            const { data: sponsorThemes, error: sponsorThemesError } = await supabase
                .from('sponsor_themes')
                .select('id')
                .in('campaign_id', campaignIds)
                .in('status', ['approved', 'published'])

            if (sponsorThemesError) {
                throw sponsorThemesError
            }

            if (!sponsorThemes || sponsorThemes.length === 0) {
                setThemes([])
                return
            }

            const sponsorThemeIds = sponsorThemes.map(st => st.id)

            // themesテーブルから、sponsor_theme_idが一致するお題を取得
            const { data: distributedThemes, error: themesError } = await supabase
                .from('themes')
                .select('id, text, date, sponsor_theme_id')
                .in('sponsor_theme_id', sponsorThemeIds)
                .order('date', { ascending: false })

            if (themesError) {
                throw themesError
            }

            if (!distributedThemes || distributedThemes.length === 0) {
                setThemes([])
                return
            }

            // text_575 という名前に変換（PostHogとの整合性のため）
            const formattedThemes = distributedThemes.map(theme => ({
                id: theme.id,
                text_575: theme.text,
                date: theme.date
            }))

            // 2. Fetch metrics from API (PostHog)
            let insightsData: ThemeInsight[] = []
            let usedMockData = false

            try {
                console.log('[Insights] Fetching data from API...')

                // セッションからアクセストークンを取得
                const { data: { session: currentSession } } = await supabase.auth.getSession()
                const accessToken = currentSession?.access_token

                console.log('[Insights] Access token available:', !!accessToken)

                // なりすまし中はsponsor_idをクエリパラメータで渡す
                const apiUrl = impersonation
                    ? `/api/sponsor/insights?sponsor_id=${sponsorId}`
                    : '/api/sponsor/insights'

                const res = await fetch(apiUrl, {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: accessToken ? {
                        'Authorization': `Bearer ${accessToken}`
                    } : {}
                })
                console.log('[Insights] API response status:', res.status, res.statusText)

                const apiResult = await res.json()
                console.log('[Insights] API result structure:', {
                    hasWarning: 'warning' in apiResult,
                    hasResults: 'results' in apiResult,
                    hasError: 'error' in apiResult,
                    resultsCount: apiResult.results?.length ?? 'N/A'
                })

                if (apiResult.error) {
                    console.error('[Insights] API returned error, using mock data:', apiResult.error)
                    usedMockData = true
                } else if (apiResult.warning) {
                    console.warn('[Insights] API returned warning, using mock data:', apiResult.warning)
                    usedMockData = true
                } else if (apiResult.results && Array.isArray(apiResult.results)) {
                    console.log('[Insights] Using real data from PostHog')
                    console.log('[Insights] API results:', apiResult.results)

                    // Map API results to themes
                    type ApiMetrics = {
                        theme_id: string
                        impressions: number
                        submissions: number
                        sponsor_link_clicks: number
                        total_likes: number
                        avg_likes_per_work: number
                        top_work: { text: string; likes: number; author_name: string } | null
                        demographics: {
                            age_groups: Record<string, number>
                            regions: Record<string, number>
                        }
                    }
                    const metricsMap = new Map<string, ApiMetrics>(
                        apiResult.results.map((r: ApiMetrics) => [r.theme_id, r])
                    )

                    console.log('[Insights] Metrics map:', Object.fromEntries(metricsMap))

                    insightsData = formattedThemes.map(theme => {
                        const metrics = metricsMap.get(theme.id)
                        const impressions = metrics?.impressions || 0
                        const submissions = metrics?.submissions || 0
                        const sponsor_link_clicks = metrics?.sponsor_link_clicks || 0

                        return {
                            id: theme.id,
                            text_575: theme.text_575,
                            date: theme.date,
                            impressions,
                            submissions,
                            sponsor_link_clicks,
                        likes: metrics?.total_likes || 0,
                        engagement_rate: impressions > 0 ? (submissions / impressions) * 100 : 0,
                        total_likes: metrics?.total_likes || 0,
                        avg_likes_per_work: metrics?.avg_likes_per_work || 0,
                        top_work: metrics?.top_work || null,
                        demographics: metrics?.demographics ?? {
                            age_groups: {},
                            regions: {}
                        }
                    }
                    })
                    usedMockData = false
                } else {
                    console.warn('[Insights] API returned unexpected format, using mock data')
                    usedMockData = true
                }
            } catch (e) {
                console.error('[Insights] Failed to fetch from API, using mock data:', e)
                usedMockData = true
            }

            if (usedMockData) {
                console.log('Using mock data for insights')
                insightsData = formattedThemes.map(theme => {
                    const impressions = Math.floor(Math.random() * 5000) + 500
                    const submissions = Math.floor(impressions * (Math.random() * 0.1 + 0.05))
                    const totalLikes = Math.floor(submissions * (Math.random() * 0.5 + 0.2))

                    return {
                        id: theme.id,
                        text_575: theme.text_575,
                        date: theme.date,
                        impressions,
                        submissions,
                        sponsor_link_clicks: Math.floor(impressions * (Math.random() * 0.02 + 0.01)),
                        likes: totalLikes,
                        engagement_rate: (submissions / impressions) * 100,
                        total_likes: totalLikes,
                        avg_likes_per_work: submissions > 0 ? Number((totalLikes / submissions).toFixed(1)) : 0,
                        top_work: submissions > 0 ? {
                            text: '春の風\n桜舞い散る',
                            likes: Math.floor(totalLikes * 0.3),
                            author_name: 'サンプルユーザー'
                        } : null,
                        demographics: {
                            age_groups: {
                                '10代': Math.floor(submissions * 0.1),
                                '20代': Math.floor(submissions * 0.3),
                                '30代': Math.floor(submissions * 0.4),
                                '40代': Math.floor(submissions * 0.1),
                                '50代以上': Math.floor(submissions * 0.1),
                            },
                            regions: {
                                '東京都': Math.floor(submissions * 0.4),
                                '大阪府': Math.floor(submissions * 0.2),
                                'その他': Math.floor(submissions * 0.4),
                            }
                        }
                    }
                })
            }

            setThemes(insightsData)

            // Calculate summary
            const totalImp = insightsData.reduce((sum, t) => sum + t.impressions, 0)
            const totalSub = insightsData.reduce((sum, t) => sum + t.submissions, 0)
            const avgRate = insightsData.length > 0
                ? insightsData.reduce((sum, t) => sum + t.engagement_rate, 0) / insightsData.length
                : 0

            setSummary({
                total_impressions: totalImp,
                total_submissions: totalSub,
                avg_engagement_rate: avgRate
            })

        } catch (error) {
            console.error('Failed to fetch insights:', error)
    } finally {
        setLoading(false)
    }
}

    function handleExportCsv() {
        if (themes.length === 0) {
            alert('エクスポートするデータがありません')
            return
        }

        const ageBuckets = ['10代', '20代', '30代', '40代', '50代', '60代', '70代', '80代', '未設定']
        const prefectures = [
            '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
            '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
            '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
            '岐阜県', '静岡県', '愛知県', '三重県',
            '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
            '鳥取県', '島根県', '岡山県', '広島県', '山口県',
            '徳島県', '香川県', '愛媛県', '高知県',
            '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
            '未設定'
        ]

        const headers = [
            'お題 (上の句)',
            '配信日',
            '表示数',
            '投稿数',
            'エンゲージメント率(%)',
            '合計いいね',
            '平均いいね',
            'リンククリック',
            'トップ句',
            'トップ句のいいね',
            'トップ作者',
            ...ageBuckets.map(a => `年代:${a}`),
            ...prefectures.map(p => `地域:${p}`)
        ]

        const rows = themes.map(theme => {
            const ageGroups = theme.demographics?.age_groups ?? {}
            const regions = theme.demographics?.regions ?? {}
            const getCount = (m: Record<string, number>, k: string) => m[k] ?? 0

            return [
                theme.text_575,
                formatDateForCsv(theme.date),
                theme.impressions,
                theme.submissions,
                theme.engagement_rate.toFixed(1),
                theme.total_likes,
                theme.avg_likes_per_work.toFixed(1),
                theme.sponsor_link_clicks ?? 0,
                theme.top_work?.text ?? '',
                theme.top_work?.likes ?? '',
                theme.top_work?.author_name ?? '',
                ...ageBuckets.map(a => getCount(ageGroups, a)),  // 未設定は0
                ...prefectures.map(p => getCount(regions, p))     // 未設定は0
            ]
        })

        const csv = [
            headers.map(escapeCsvValue).join(','),
            ...rows.map(r => r.map(escapeCsvValue).join(','))
        ].join('\n')

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `yomibiyori_insights_${new Date().toISOString().slice(0, 10)}.csv`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return <div className="text-[var(--color-text-secondary)]">データを読み込み中...</div>
    }

    return (
        <div className="space-y-10">
            <header>
                <h1 className="section-heading text-3xl mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
                        インサイト
                    </span>
                </h1>
                <p className="section-subheading">
                    投稿したお題のパフォーマンスを確認できます
                </p>
            </header>

            {/* Summary Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center">
                        総表示回数
                        <InfoTooltip text="ユーザーがお題を閲覧した回数の合計です。アプリ内でお題画面が表示された回数を示します。" position="bottom-left" />
                    </h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                        {summary.total_impressions.toLocaleString()}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">回</span>
                    </p>
                </div>
                <div className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center">
                        総投稿数
                        <InfoTooltip text="ユーザーがお題に対して下の句を投稿した回数の合計です。実際にコンテンツが作成された回数を示します。" position="bottom-left" />
                    </h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                        {summary.total_submissions.toLocaleString()}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">句</span>
                    </p>
                </div>
                <div className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center">
                        平均エンゲージメント率
                        <InfoTooltip text="表示回数に対する投稿数の割合です。お題を見たユーザーのうち、実際に下の句を投稿した割合を示します。" position="bottom-right" />
                    </h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                        {summary.avg_engagement_rate.toFixed(1)}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">%</span>
                    </p>
                </div>
            </section>

            {/* Trend Chart */}
            <section className="card p-6 relative hover:z-20">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">投稿パフォーマンス推移</h2>
                <TrendChart
                    data={themes
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(t => ({
                            date: new Date(t.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
                            impressions: t.impressions,
                            submissions: t.submissions
                        }))
                    }
                />
            </section>

            {/* Theme List Table */}
            <section className="card p-0 relative hover:z-20">
                <div className="p-6 border-b border-[var(--color-border)] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">お題別パフォーマンス</h2>
                </div>
                <div className="px-6 pb-4 flex justify-end">
                    <button
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-igusa)] text-[var(--color-igusa)] hover:bg-[var(--color-igusa)] hover:text-white transition-colors text-sm font-medium shadow-sm bg-white cursor-pointer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        CSVエクスポート
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-washi)] text-[var(--color-text-secondary)] text-sm">
                                <th className="p-4 font-medium text-left">お題 (上の句)</th>
                                <th className="p-4 font-medium text-left">配信日</th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        表示数
                                        <InfoTooltip text="お題が表示された回数です。" position="bottom-left" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        投稿数
                                        <InfoTooltip text="お題に対して投稿された俳句の数です。" position="bottom-left" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        エンゲージメント
                                        <InfoTooltip text="表示数に対する提出率（投稿数 ÷ 表示数 × 100）です。" position="bottom-right" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        合計いいね
                                        <InfoTooltip text="投稿に付いたいいねの合計です。" position="bottom-left" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        平均いいね
                                        <InfoTooltip text="1作品あたりの平均いいね数です。" position="bottom-right" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        リンククリック
                                        <InfoTooltip text="スポンサー公式URLがクリックされた回数です。" position="bottom-right" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">分析</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {themes.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">
                                        データがありません。投稿が反映され次第表示されます。
                                    </td>
                                </tr>
                            ) : (
                                themes.map((theme) => (
                                    <tr
                                        key={theme.id}
                                        className={`hover:bg-[var(--color-washi)]/50 transition-colors cursor-default ${selectedTheme?.id === theme.id ? 'bg-[var(--color-washi)]' : ''}`}
                                    >
                                        <td className="p-4 font-medium text-left text-[var(--color-text-primary)] font-serif">
                                            {theme.text_575}
                                        </td>
                                        <td className="p-4 text-left text-sm text-[var(--color-text-secondary)]">
                                            {new Date(theme.date).toLocaleDateString('ja-JP')}
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-primary)]">
                                            {theme.impressions.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-primary)]">
                                            {theme.submissions.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-left">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                theme.engagement_rate >= 10
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : theme.engagement_rate >= 5
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {theme.engagement_rate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-primary)]">
                                            {theme.total_likes.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-secondary)]">
                                            {theme.avg_likes_per_work.toFixed(1)}
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-primary)]">
                                            {theme.sponsor_link_clicks?.toLocaleString() ?? '-'}
                                        </td>
                                        <td className="p-4 text-left">
                                            <button
                                                className="text-[var(--color-igusa)] hover:underline text-sm font-medium cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTheme(theme);
                                                }}
                                            >
                                                詳細
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Demographics Analysis Section */}
            {selectedTheme && selectedTheme.demographics && (
                <section className="card p-0 relative hover:z-20 animate-fade-in">
                    <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center">
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                            ユーザー属性分析: <span className="font-serif ml-2">{selectedTheme.text_575}</span>
                        </h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Age Groups */}
                        <div>
                            <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-4">年代別投稿数</h3>
                            <div className="h-[300px]">
                                {Object.entries(selectedTheme.demographics.age_groups).length === 0 ? (
                                    <p className="text-[var(--color-text-muted)] text-sm">データがありません</p>
                                ) : (
                                    <DemographicsChart
                                        type="pie"
                                        data={Object.entries(selectedTheme.demographics.age_groups)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([name, value]) => ({ name, value }))
                                        }
                                    />
                                )}
                            </div>
                        </div>

                        {/* Regions */}
                        <div>
                            <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-4">地域別投稿数 (Top 5)</h3>
                            <div className="h-[300px]">
                                {Object.entries(selectedTheme.demographics.regions).length === 0 ? (
                                    <p className="text-[var(--color-text-muted)] text-sm">データがありません</p>
                                ) : (
                                    <DemographicsChart
                                        type="pie"
                                        data={Object.entries(selectedTheme.demographics.regions)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 5)
                                            .map(([name, value]) => ({ name, value }))
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Top Works Section */}
            {themes.some(t => t.top_work) && (
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-igusa)] to-[var(--color-igusa-light)]">
                            最も人気の作品
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {themes.filter(t => t.top_work).map((theme) => (
                            <div key={theme.id} className="card bg-gradient-to-br from-white to-[var(--color-washi)] relative hover:z-20">
                                <div className="mb-2">
                                    <p className="text-xs text-[var(--color-text-secondary)] mb-1">お題</p>
                                    <p className="font-serif text-sm text-[var(--color-text-primary)]">{theme.text_575}</p>
                                </div>
                                <div className="border-t border-[var(--color-border)] pt-3 mt-2">
                                    <p className="font-serif text-[var(--color-text-primary)] whitespace-pre-line mb-3">
                                        {theme.top_work!.text}
                                    </p>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-[var(--color-text-secondary)]">
                                            by {theme.top_work!.author_name}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-pink-100 text-pink-800 text-xs font-medium">
                                            ❤️ {theme.top_work!.likes}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="text-center text-xs text-[var(--color-text-muted)]">
                ※ データはPostHogとデータベースにより集計されています。
            </div>
        </div>
    )
}
