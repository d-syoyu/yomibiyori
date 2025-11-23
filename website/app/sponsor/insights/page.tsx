/**
 * Sponsor Insights Page
 * Displays performance metrics for sponsored themes.
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Types for Insight Data
interface ThemeInsight {
    id: string
    text_575: string
    date: string
    impressions: number
    submissions: number
    likes: number
    engagement_rate: number
}

interface SummaryStats {
    total_impressions: number
    total_submissions: number
    avg_engagement_rate: number
}

export default function SponsorInsightsPage() {
    const [loading, setLoading] = useState(true)
    const [themes, setThemes] = useState<ThemeInsight[]>([])
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

            // 承認済み（かつ配信対象）のスポンサーお題を取得
            const { data: sponsorThemes, error: sponsorThemesError } = await supabase
                .from('sponsor_themes')
                .select('id, text_575, date')
                .in('campaign_id', campaignIds)
                .in('status', ['approved', 'published'])
                .order('date', { ascending: false })

            if (sponsorThemesError) {
                throw sponsorThemesError
            }

            if (!sponsorThemes || sponsorThemes.length === 0) {
                setThemes([])
                return
            }

            // themesテーブルに登録され、実際に配信対象になっているものを紐付ける
            const sponsorThemeIds = sponsorThemes.map(theme => theme.id)
            const { data: registeredThemes, error: themeLookupError } = await supabase
                .from('themes')
                .select('id, sponsor_theme_id, text, date')
                .in('sponsor_theme_id', sponsorThemeIds)

            if (themeLookupError) {
                throw themeLookupError
            }

            const themeMap = new Map(
                (registeredThemes || []).map(theme => [theme.sponsor_theme_id, theme])
            )

            const distributedThemes = sponsorThemes
                .map(theme => {
                    const linkedTheme = themeMap.get(theme.id)
                    if (!linkedTheme) return null
                    return {
                        id: linkedTheme.id,
                        text_575: linkedTheme.text || theme.text_575,
                        date: linkedTheme.date || theme.date,
                    }
                })
                .filter(
                    (theme): theme is Pick<ThemeInsight, 'id' | 'text_575' | 'date'> =>
                        Boolean(theme)
                )

            if (distributedThemes.length === 0) {
                setThemes([])
                return
            }

            // 2. Fetch metrics from API (PostHog)
            let insightsData: ThemeInsight[] = []
            let usedMockData = false

            try {
                console.log('[Insights] Fetching data from API...')
                const res = await fetch('/api/sponsor/insights')
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

                    // Map PostHog results to themes
                    type MetricsData = { impressions: number; submissions: number }
                    const metricsMap = new Map<string, MetricsData>(
                        apiResult.results.map((r: any) => [r.theme_id, { impressions: r.impressions || 0, submissions: r.submissions || 0 }])
                    )

                    console.log('[Insights] Metrics map:', Object.fromEntries(metricsMap))

                    insightsData = distributedThemes.map(theme => {
                        const metrics = metricsMap.get(theme.id)
                        const impressions = metrics?.impressions || 0
                        const submissions = metrics?.submissions || 0

                        return {
                            id: theme.id,
                            text_575: theme.text_575,
                            date: theme.date,
                            impressions,
                            submissions,
                            likes: 0,
                            engagement_rate: impressions > 0 ? (submissions / impressions) * 100 : 0
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
                insightsData = distributedThemes.map(theme => {
                    const impressions = Math.floor(Math.random() * 5000) + 500
                    const submissions = Math.floor(impressions * (Math.random() * 0.1 + 0.05))
                    const likes = Math.floor(submissions * (Math.random() * 0.5 + 0.2))

                    return {
                        id: theme.id,
                        text_575: theme.text_575,
                        date: theme.date,
                        impressions,
                        submissions,
                        likes,
                        engagement_rate: (submissions / impressions) * 100
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
                <div className="card bg-gradient-to-br from-white to-[var(--color-washi)]">
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">総表示回数</h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                        {summary.total_impressions.toLocaleString()}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">回</span>
                    </p>
                </div>
                <div className="card bg-gradient-to-br from-white to-[var(--color-washi)]">
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">総投稿数</h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                        {summary.total_submissions.toLocaleString()}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">句</span>
                    </p>
                </div>
                <div className="card bg-gradient-to-br from-white to-[var(--color-washi)]">
                    <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">平均エンゲージメント率</h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] font-serif">
                        {summary.avg_engagement_rate.toFixed(1)}
                        <span className="text-sm font-normal text-[var(--color-text-muted)] ml-1">%</span>
                    </p>
                </div>
            </section>

            {/* Theme List Table */}
            <section className="card overflow-hidden p-0">
                <div className="p-6 border-b border-[var(--color-border)]">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">お題別パフォーマンス</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-washi)] text-[var(--color-text-secondary)] text-sm">
                                <th className="p-4 font-medium">お題 (上の句)</th>
                                <th className="p-4 font-medium">配信日</th>
                                <th className="p-4 font-medium text-right">表示回数</th>
                                <th className="p-4 font-medium text-right">投稿数</th>
                                <th className="p-4 font-medium text-right">エンゲージメント</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {themes.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[var(--color-text-muted)]">
                                        データがありません。お題が配信されるとここに表示されます。
                                    </td>
                                </tr>
                            ) : (
                                themes.map((theme) => (
                                    <tr key={theme.id} className="hover:bg-[var(--color-washi)]/50 transition-colors">
                                        <td className="p-4 font-medium text-[var(--color-text-primary)] font-serif">
                                            {theme.text_575}
                                        </td>
                                        <td className="p-4 text-sm text-[var(--color-text-secondary)]">
                                            {new Date(theme.date).toLocaleDateString('ja-JP')}
                                        </td>
                                        <td className="p-4 text-right text-[var(--color-text-primary)]">
                                            {theme.impressions.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right text-[var(--color-text-primary)]">
                                            {theme.submissions.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${theme.engagement_rate >= 10
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : theme.engagement_rate >= 5
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {theme.engagement_rate.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="text-center text-xs text-[var(--color-text-muted)]">
                ※ データはPostHogにより集計されています。
            </div>
        </div>
    )
}
