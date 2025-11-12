'use client'

import { getSupabase } from '@/lib/supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1'

async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('ログインが必要です')
  }

  const headers = new Headers(options.headers as HeadersInit | undefined)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Authorization', `Bearer ${session.access_token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `API request failed (${response.status})`
    try {
      const payload = await response.json()
      message = payload?.error?.detail ?? payload?.detail ?? message
    } catch (error) {
      const text = await response.text()
      if (text) {
        message = text
      }
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export interface SponsorProfile {
  id: string
  company_name: string
  contact_email?: string | null
  official_url?: string | null
  logo_url?: string | null
  plan_tier: string
  verified: boolean
  created_at: string
  updated_at: string
}

export interface SponsorProfilePayload {
  company_name: string
  contact_email?: string | null
  official_url?: string | null
  logo_url?: string | null
  plan_tier: string
}

export function fetchSponsorProfile(): Promise<SponsorProfile> {
  return authenticatedRequest<SponsorProfile>('/sponsor/profile')
}

export function createSponsorProfile(payload: SponsorProfilePayload): Promise<SponsorProfile> {
  return authenticatedRequest<SponsorProfile>('/sponsor/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
