/**
 * Custom hook for sponsor authentication
 * Handles both regular sponsor login and admin impersonation
 */

'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { endImpersonation, getImpersonation, ImpersonationData } from '@/lib/impersonation'

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
    const emptyState: SponsorAuthState = {
      sponsorId: null,
      isImpersonating: false,
      impersonation: null,
      loading: false,
      accessToken: null,
    }

    async function resolveState(session: Session | null): Promise<SponsorAuthState> {
      const impersonation = getImpersonation()

      if (impersonation) {
        if (!session) {
          endImpersonation()
          return emptyState
        }

        const { data: adminUser, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (!error && adminUser?.role === 'admin') {
          return {
            sponsorId: impersonation.sponsorId,
            isImpersonating: true,
            impersonation,
            loading: false,
            accessToken: session.access_token,
          }
        }

        endImpersonation()
      }

      if (session) {
        return {
          sponsorId: session.user.id,
          isImpersonating: false,
          impersonation: null,
          loading: false,
          accessToken: session.access_token,
        }
      }

      return emptyState
    }

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const nextState = await resolveState(session)
        setState(nextState)
      } catch (error) {
        console.error('Failed to initialize sponsor auth:', error)
        setState(emptyState)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextState = await resolveState(session)
        setState(nextState)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return state
}
