/**
 * Custom hook for sponsor authentication
 * Handles both regular sponsor login and admin impersonation
 */

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getImpersonation, ImpersonationData } from '@/lib/impersonation'

export interface SponsorAuthState {
  /** The sponsor ID (either logged in user or impersonated sponsor) */
  sponsorId: string | null
  /** Whether the current session is an admin impersonating a sponsor */
  isImpersonating: boolean
  /** The impersonation data if impersonating */
  impersonation: ImpersonationData | null
  /** Whether the auth state is still being determined */
  loading: boolean
  /** The Supabase session access token (for API calls) */
  accessToken: string | null
}

/**
 * Hook to get the current sponsor authentication state.
 * Automatically handles both regular sponsor login and admin impersonation.
 *
 * @example
 * ```tsx
 * function SponsorPage() {
 *   const { sponsorId, isImpersonating, loading } = useSponsorAuth()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (!sponsorId) return <div>Not authenticated</div>
 *
 *   // Use sponsorId for data fetching
 * }
 * ```
 */
export function useSponsorAuth(): SponsorAuthState {
  const [state, setState] = useState<SponsorAuthState>({
    sponsorId: null,
    isImpersonating: false,
    impersonation: null,
    loading: true,
    accessToken: null,
  })

  useEffect(() => {
    async function initAuth() {
      try {
        // Check for impersonation first
        const impersonation = getImpersonation()
        const { data: { session } } = await supabase.auth.getSession()

        if (impersonation) {
          // Admin is impersonating a sponsor
          setState({
            sponsorId: impersonation.sponsorId,
            isImpersonating: true,
            impersonation,
            loading: false,
            accessToken: session?.access_token || null,
          })
        } else if (session) {
          // Regular sponsor login
          setState({
            sponsorId: session.user.id,
            isImpersonating: false,
            impersonation: null,
            loading: false,
            accessToken: session.access_token,
          })
        } else {
          // Not authenticated
          setState({
            sponsorId: null,
            isImpersonating: false,
            impersonation: null,
            loading: false,
            accessToken: null,
          })
        }
      } catch (error) {
        console.error('Failed to initialize sponsor auth:', error)
        setState({
          sponsorId: null,
          isImpersonating: false,
          impersonation: null,
          loading: false,
          accessToken: null,
        })
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const impersonation = getImpersonation()

        if (impersonation) {
          setState(prev => ({
            ...prev,
            accessToken: session?.access_token || null,
          }))
        } else if (session) {
          setState({
            sponsorId: session.user.id,
            isImpersonating: false,
            impersonation: null,
            loading: false,
            accessToken: session.access_token,
          })
        } else {
          setState({
            sponsorId: null,
            isImpersonating: false,
            impersonation: null,
            loading: false,
            accessToken: null,
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return state
}
