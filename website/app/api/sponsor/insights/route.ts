import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    try {
        // 1. Auth Check
        const supabase = await createClient()

        // Authorizationヘッダーからトークンを取得
        const authHeader = request.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '')

        console.log('[Insights API] Auth header check:', {
            hasAuthHeader: !!authHeader,
            hasToken: !!token
        })

        let session = null
        let sessionError = null

        // トークンがある場合はそれを使用、なければクッキーから取得
        if (token) {
            const { data, error } = await supabase.auth.getUser(token)
            if (data?.user) {
                session = { user: data.user }
            }
            sessionError = error
        } else {
            const result = await supabase.auth.getSession()
            session = result.data.session
            sessionError = result.error
        }

        console.log('[Insights API] Auth check result:', {
            hasSession: !!session,
            sessionError: sessionError?.message,
            userId: session?.user?.id
        })

        if (!session) {
            console.warn('[Insights API] No session found, returning 401')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Check for sponsor_id parameter (for admin impersonation)
        const url = new URL(request.url)
        const sponsorIdParam = url.searchParams.get('sponsor_id')
        let targetSponsorId = session.user.id

        if (sponsorIdParam) {
            // Verify the user is an admin before allowing sponsor_id override
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single()

            if (userData?.role === 'admin') {
                targetSponsorId = sponsorIdParam
                console.log('[Insights API] Admin impersonation, using sponsor_id:', targetSponsorId)
            } else {
                console.warn('[Insights API] Non-admin tried to use sponsor_id param, ignoring')
            }
        }

        // 3. Env Check
        const projectId = process.env.POSTHOG_PROJECT_ID
        const apiKey = process.env.POSTHOG_PERSONAL_API_KEY

        if (!projectId || !apiKey) {
            console.warn('PostHog credentials not configured')
            // Return empty data instead of error to allow UI to show "No Data" or mock
            return NextResponse.json({
                results: [],
                warning: 'PostHog not configured'
            })
        }

        // 4. Resolve sponsorが持つテーマIDを取得し、PostHogを絞り込む
        const { data: campaigns, error: campaignsError } = await supabase
            .from('sponsor_campaigns')
            .select('id')
            .eq('sponsor_id', targetSponsorId)

        if (campaignsError) {
            console.error('[Insights API] Failed to fetch sponsor campaigns:', campaignsError)
            return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
        }

        if (!campaigns || campaigns.length === 0) {
            console.warn('[Insights API] No campaigns for sponsor, returning empty results')
            return NextResponse.json({ results: [] })
        }

        const campaignIds = campaigns.map(c => c.id)

        const { data: sponsorThemes, error: sponsorThemesError } = await supabase
            .from('sponsor_themes')
            .select('id')
            .in('campaign_id', campaignIds)
            .in('status', ['approved', 'published'])

        if (sponsorThemesError) {
            console.error('[Insights API] Failed to fetch sponsor themes:', sponsorThemesError)
            return NextResponse.json({ error: 'Failed to fetch sponsor themes' }, { status: 500 })
        }

        if (!sponsorThemes || sponsorThemes.length === 0) {
            console.warn('[Insights API] No sponsor themes found, returning empty results')
            return NextResponse.json({ results: [] })
        }

        const sponsorThemeIds = sponsorThemes.map(st => st.id)

        const { data: distributedThemes, error: distributedThemesError } = await supabase
            .from('themes')
            .select('id')
            .in('sponsor_theme_id', sponsorThemeIds)

        if (distributedThemesError) {
            console.error('[Insights API] Failed to fetch distributed themes:', distributedThemesError)
            return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 })
        }

        const targetThemeIds = (distributedThemes ?? []).map(t => t.id).filter(Boolean)

        if (targetThemeIds.length === 0) {
            console.warn('[Insights API] No distributed themes found for sponsor, returning empty results')
            return NextResponse.json({ results: [] })
        }

        // 4. Fetch Data from PostHog
        // We want to get event counts broken down by theme_id
        // API: /api/projects/:id/insights/trend/

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        }

        // Use POST to avoid URL length issues and ensure properties filter is respected
        const payload = {
            events: [
                { id: 'theme_viewed', math: 'total', name: 'Impressions' },
                { id: 'work_created', math: 'total', name: 'Submissions' },
                { id: 'sponsor_link_clicked', math: 'total', name: 'Sponsor Link Clicks' }
            ],
            breakdown: 'theme_id',
            breakdown_type: 'event',
            date_from: 'all', // Get all time data
            display: 'ActionsTable', // Get tabular data
            sampling_factor: 1, // Disable sampling to align with PostHog Events tab counts
            // sponsor配信テーマのみ取得するためにtheme_idのinフィルタを設定
            properties: [
                {
                    key: 'theme_id',
                    value: targetThemeIds,
                    operator: 'exact',
                    type: 'event'
                }
            ]
            // Note: is_sample_account filter removed because it excludes events without the property
            // (i.e., all events before the property was added). We'll filter in post-processing instead.
        }

        const response = await fetch(
            `https://app.posthog.com/api/projects/${projectId}/insights/trend/`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('PostHog API Error:', response.status, errorText)
            // Degrade gracefully to avoid 500 on our API; front側でwarningを見てモック表示
            return NextResponse.json({
                results: [],
                warning: `PostHog API error: ${response.status}`
            })
        }

        const data = await response.json()

        // Debug: Log raw PostHog API response
        console.log('[PostHog API] Raw response structure:', {
            hasResult: 'result' in data,
            hasResults: 'results' in data,
            resultType: typeof data.result,
            isArray: Array.isArray(data.result),
            resultLength: Array.isArray(data.result) ? data.result.length : 'N/A'
        })

        // 4. Transform Data
        // PostHog 'trend' API with breakdown returns a flat array of series.
        // Each item represents a specific event filtered by a specific breakdown value (theme_id).
        // We need to aggregate these by theme_id.

        const metricsByTheme: Record<string, { impressions: number; submissions: number; sponsor_link_clicks: number }> = {}

        if (Array.isArray(data.result)) {
            console.log('[PostHog API] Processing', data.result.length, 'result items')

            data.result.forEach((item: any, index: number) => {
                // Debug: Log first few items to understand structure
                if (index < 3) {
                    console.log(`[PostHog API] Item ${index} structure:`, {
                        breakdown_value: item.breakdown_value,
                        action_id: item.action?.id,
                        action_name: item.action?.name,
                        event: item.event,
                        count: item.count,
                        label: item.label,
                        hasData: 'data' in item,
                        dataLength: Array.isArray(item.data) ? item.data.length : 'N/A',
                        aggregated_value: item.aggregated_value
                    })
                }

                const themeId = item.breakdown_value
                // Filter out invalid theme IDs (both string and actual undefined/null)
                if (!themeId || themeId === 'undefined' || themeId === 'null' || themeId === '$$_posthog_breakdown_null_$$' || themeId === '$$_posthog_breakdown_other_$$') {
                    return
                }

                if (!metricsByTheme[themeId]) {
                    metricsByTheme[themeId] = { impressions: 0, submissions: 0, sponsor_link_clicks: 0 }
                }

                // Identify event type based on multiple possible fields
                // PostHog API may return event name in different formats
                const eventId = item.action?.id || item.event || item.action?.name
                const label = item.label || ''

                // Check multiple conditions for robustness
                const isImpression = eventId === 'theme_viewed' ||
                                     label.includes('theme_viewed') ||
                                     label.includes('Impressions')

                const isSubmission = eventId === 'work_created' ||
                                     label.includes('work_created') ||
                                     label.includes('Submissions')

                const isSponsorClick = eventId === 'sponsor_link_clicked' ||
                                       label.includes('sponsor_link_clicked') ||
                                       label.includes('Sponsor Link Clicks')

                // Get actual count from aggregated_value or sum of data array
                let actualCount = 0
                if (typeof item.aggregated_value === 'number') {
                    actualCount = item.aggregated_value
                } else if (Array.isArray(item.data)) {
                    actualCount = item.data.reduce((sum: number, val: number) => sum + (val || 0), 0)
                } else {
                    actualCount = item.count || 0
                }

                if (isImpression) {
                    metricsByTheme[themeId].impressions += actualCount
                } else if (isSubmission) {
                    metricsByTheme[themeId].submissions += actualCount
                } else if (isSponsorClick) {
                    metricsByTheme[themeId].sponsor_link_clicks += actualCount
                } else {
                    // Debug: Log unmatched events
                    console.log('[PostHog API] Unmatched event:', { eventId, label, themeId })
                }
            })

            console.log('[PostHog API] Aggregated metrics by theme:', metricsByTheme)
        } else {
            console.warn('[PostHog API] data.result is not an array, type:', typeof data.result)
        }

        // 5. Fetch additional metrics from database (likes, top works, ranking entries, demographics)
        const themeIds = Object.keys(metricsByTheme)

        // Get works data for each theme from Supabase
        const enrichedResults = await Promise.all(themeIds.map(async (themeId) => {
            const metrics = metricsByTheme[themeId]

            // Fetch works for this theme with likes count and user info
            const { data: works, error: worksError } = await supabase
                .from('works')
                .select(`
                    id,
                    text,
                    user_id,
                    likes:likes(count),
                    user:users(
                        name,
                        email,
                        birth_year,
                        prefecture
                    )
                `)
                .eq('theme_id', themeId)
                .order('created_at', { ascending: false })

            if (worksError) {
                console.error(`[Insights API] Failed to fetch works for theme ${themeId}:`, worksError)
                return {
                    theme_id: themeId,
                    impressions: metrics.impressions,
                    submissions: metrics.submissions,
                    total_likes: 0,
                    avg_likes_per_work: 0,
                    top_work: null,
                    ranking_entries: 0,
                    demographics: {
                        age_groups: {},
                        regions: {}
                    }
                }
            }

            // Calculate likes metrics and demographics
            const worksWithLikes = (works || []).map(work => ({
                ...work,
                likes_count: Array.isArray(work.likes) ? work.likes[0]?.count || 0 : 0
            }))

            const totalLikes = worksWithLikes.reduce((sum, work) => sum + work.likes_count, 0)
            const avgLikes = worksWithLikes.length > 0 ? totalLikes / worksWithLikes.length : 0

            // Demographics Aggregation
            const ageGroups: Record<string, number> = {}
            const regions: Record<string, number> = {}
            const currentYear = new Date().getFullYear()

            worksWithLikes.forEach(work => {
                const user = work.user as any
                if (!user) return

                // Age Group
                if (user.birth_year) {
                    const age = currentYear - user.birth_year
                    const group = Math.floor(age / 10) * 10
                    const groupLabel = `${group}代`
                    ageGroups[groupLabel] = (ageGroups[groupLabel] || 0) + 1
                } else {
                    ageGroups['未設定'] = (ageGroups['未設定'] || 0) + 1
                }

                // Region
                if (user.prefecture) {
                    regions[user.prefecture] = (regions[user.prefecture] || 0) + 1
                } else {
                    regions['未設定'] = (regions['未設定'] || 0) + 1
                }
            })

            // Get top work by likes
            const topWork = worksWithLikes.length > 0
                ? worksWithLikes.reduce((prev, current) =>
                    (current.likes_count > prev.likes_count) ? current : prev
                  )
                : null

            // Get user display name for top work
            let topWorkData = null
            if (topWork && topWork.likes_count > 0) {
                const user = topWork.user as any
                topWorkData = {
                    text: topWork.text,
                    likes: topWork.likes_count,
                    author_name: user?.name || user?.email?.split('@')[0] || '匿名'
                }
            }

            // Get ranking entries (works that have ranking > 0)
            const { data: rankingWorks, error: rankingError } = await supabase
                .from('rankings') // Changed from daily_rankings to rankings (based on SCHEMA.sql)
                .select('work_id, rank')
                .in('work_id', worksWithLikes.map(w => w.id))
                .order('rank', { ascending: true })

            const rankingEntries = rankingError ? 0 : (rankingWorks?.length || 0)

            return {
                theme_id: themeId,
                impressions: metrics.impressions,
                submissions: metrics.submissions,
                total_likes: totalLikes,
                avg_likes_per_work: Number(avgLikes.toFixed(1)),
                top_work: topWorkData,
                    ranking_entries: rankingEntries,
                    sponsor_link_clicks: metrics.sponsor_link_clicks,
                    demographics: {
                        age_groups: ageGroups,
                        regions: regions
                    }
                }
        }))

        return NextResponse.json({ results: enrichedResults })

    } catch (error) {
        console.error('Insights API Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
