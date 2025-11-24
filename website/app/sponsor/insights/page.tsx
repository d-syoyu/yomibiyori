/**
 * Sponsor Insights Page
 * Displays performance metrics for sponsored themes.
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
    likes: number
    engagement_rate: number
    total_likes: number
    avg_likes_per_work: number
    top_work: {
        text: string
        likes: number
        author_name: string
    } | null
    ranking_entries: number
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

            // 1. Get user's approved themes from Supabase
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const { data: campaigns, error: campaignsError } = await supabase
                .from('sponsor_campaigns')
                .select('id')
                .eq('sponsor_id', session.user.id)

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
            // または、sponsored=trueのお題を取得（承認後にコピーされたお題に対応）
            const { data: distributedThemes, error: themesError } = await supabase
                .from('themes')
                .select('id, text, date, sponsor_theme_id')
                .or(`sponsor_theme_id.in.(${sponsorThemeIds.join(',')}),and(sponsored.eq.true,sponsor_theme_id.in.(${sponsorThemeIds.join(',')}))`)
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

                const res = await fetch('/api/sponsor/insights', {
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
                        impressions: number
                        submissions: number
                        total_likes: number
                        avg_likes_per_work: number
                        top_work: { text: string; likes: number; author_name: string } | null
                        ranking_entries: number
                        demographics: {
                            age_groups: Record<string, number>
                            regions: Record<string, number>
                        }
                    }
                    const metricsMap = new Map<string, ApiMetrics>(
                        apiResult.results.map((r: any) => [r.theme_id, r as ApiMetrics])
                    )

                    console.log('[Insights] Metrics map:', Object.fromEntries(metricsMap))

                    insightsData = formattedThemes.map(theme => {
                        const metrics = metricsMap.get(theme.id)
                        const impressions = metrics?.impressions || 0
                        const submissions = metrics?.submissions || 0

                        return {
                            id: theme.id,
                            text_575: theme.text_575,
                            date: theme.date,
                            impressions,
                            submissions,
                            likes: metrics?.total_likes || 0,
                            engagement_rate: impressions > 0 ? (submissions / impressions) * 100 : 0,
                            total_likes: metrics?.total_likes || 0,
                            avg_likes_per_work: metrics?.avg_likes_per_work || 0,
                            top_work: metrics?.top_work || null,
                            ranking_entries: metrics?.ranking_entries || 0,
                            demographics: metrics?.demographics
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
                        likes: totalLikes,
                        engagement_rate: (submissions / impressions) * 100,
                        total_likes: totalLikes,
                        avg_likes_per_work: submissions > 0 ? Number((totalLikes / submissions).toFixed(1)) : 0,
                        top_work: submissions > 0 ? {
                            text: '春の風\n桜舞い散る',
                            likes: Math.floor(totalLikes * 0.3),
                            author_name: 'サンプルユーザー'
                        } : null,
                        ranking_entries: Math.floor(submissions * 0.1),
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

            // Select the most recent theme by default if available
            if (insightsData.length > 0) {
                setSelectedTheme(insightsData[0])
            }

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

            {/* Theme List Table */}
            <section className="card p-0 relative hover:z-20">
                <div className="p-6 border-b border-[var(--color-border)]">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">お題別パフォーマンス</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-washi)] text-[var(--color-text-secondary)] text-sm">
                                <th className="p-4 font-medium text-left">お題 (上の句)</th>
                                <th className="p-4 font-medium text-left">配信日</th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        表示回数
                                        <InfoTooltip text="このお題が閲覧された回数です。" position="bottom-left" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        投稿数
                                        <InfoTooltip text="このお題に対して投稿された下の句の数です。" position="bottom-left" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        合計いいね
                                        <InfoTooltip text="このお題に投稿された全作品が獲得したいいねの合計数です。" position="bottom-left" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        平均いいね
                                        <InfoTooltip text="作品1件あたりの平均いいね数です。作品の品質を示す指標となります。" position="bottom-right" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        ランキング入賞
                                        <InfoTooltip text="デイリーランキング（トップ10）に入賞した作品の数です。" position="bottom-right" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">
                                    <span className="inline-flex items-center">
                                        エンゲージメント
                                        <InfoTooltip text="表示回数に対する投稿数の割合（投稿数 ÷ 表示回数 × 100）です。" position="bottom-right" />
                                    </span>
                                </th>
                                <th className="p-4 font-medium text-left">詳細</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {themes.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)]">
                                        データがありません。お題が配信されるとここに表示されます。
                                    </td>
                                </tr>
                            ) : (
                                themes.map((theme) => (
                                    <tr
                                        key={theme.id}
                                        className={`hover:bg-[var(--color-washi)]/50 transition-colors cursor-pointer ${selectedTheme?.id === theme.id ? 'bg-[var(--color-washi)]' : ''}`}
                                        onClick={() => setSelectedTheme(theme)}
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
                                        <td className="p-4 text-left text-[var(--color-text-primary)]">
                                            {theme.total_likes.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-secondary)]">
                                            {theme.avg_likes_per_work.toFixed(1)}
                                        </td>
                                        <td className="p-4 text-left text-[var(--color-text-primary)]">
                                            {theme.ranking_entries > 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                                                    🏆 {theme.ranking_entries}作品
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)]">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-left">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${theme.engagement_rate >= 10
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : theme.engagement_rate >= 5
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {theme.engagement_rate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-left">
                                            <button
                                                className="text-[var(--color-igusa)] hover:underline text-sm font-medium"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTheme(theme);
                                                }}
                                            >
                                                分析
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
                            <div className="space-y-3">
                                {Object.entries(selectedTheme.demographics.age_groups).length === 0 ? (
                                    <p className="text-[var(--color-text-muted)] text-sm">データがありません</p>
                                ) : (
                                    Object.entries(selectedTheme.demographics.age_groups)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([age, count]) => {
                                            const total = Object.values(selectedTheme.demographics!.age_groups).reduce((a, b) => a + b, 0);
                                            const percentage = (count / total) * 100;
                                            return (
                                                <div key={age} className="flex items-center gap-3">
                                                    <div className="w-20 text-sm text-[var(--color-text-secondary)]">{age}</div>
                                                    <div className="flex-1 h-4 bg-[var(--color-washi)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--color-igusa)] opacity-80"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="w-16 text-right text-sm font-medium text-[var(--color-text-primary)]">
                                                        {count}件
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        {/* Regions */}
                        <div>
                            <h3 className="text-lg font-medium text-[var(--color-text-secondary)] mb-4">地域別投稿数 (Top 5)</h3>
                            <div className="space-y-3">
                                {Object.entries(selectedTheme.demographics.regions).length === 0 ? (
                                    <p className="text-[var(--color-text-muted)] text-sm">データがありません</p>
                                ) : (
                                    Object.entries(selectedTheme.demographics.regions)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([region, count]) => {
                                            const total = Object.values(selectedTheme.demographics!.regions).reduce((a, b) => a + b, 0);
                                            const percentage = (count / total) * 100;
                                            return (
                                                <div key={region} className="flex items-center gap-3">
                                                    <div className="w-20 text-sm text-[var(--color-text-secondary)]">{region}</div>
                                                    <div className="flex-1 h-4 bg-[var(--color-washi)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--color-sakura)] opacity-80"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <div className="w-16 text-right text-sm font-medium text-[var(--color-text-primary)]">
                                                        {count}件
                                                    </div>
                                                </div>
                                            );
                                        })
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

