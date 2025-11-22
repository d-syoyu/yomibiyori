'use client'

import { getSupabase } from '@/lib/supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1'

async function authenticatedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('セッションが無効です。再ログインしてください。')
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
    let message = `API request failed (status ${response.status})`
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

export interface AdminSponsor {
  id: string
  company_name: string
  contact_email?: string | null
  official_url?: string | null
  plan_tier: string
  verified: boolean
  credits: number
  created_at: string
  updated_at: string
}

export interface SponsorListPayload {
  sponsors: AdminSponsor[]
  total: number
}

export async function fetchSponsorList(params: {
  verified?: boolean | null
  search?: string
  limit?: number
  offset?: number
} = {}): Promise<SponsorListPayload> {
  const query = new URLSearchParams()
  if (typeof params.verified === 'boolean') {
    query.set('verified', String(params.verified))
  }
  if (params.search) {
    query.set('search', params.search)
  }
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
  }

  const queryString = query.toString()
  const path = queryString ? `/admin/sponsors?${queryString}` : '/admin/sponsors'
  return authenticatedRequest<SponsorListPayload>(path)
}

export async function updateSponsorVerification(
  sponsorId: string,
  verified: boolean,
): Promise<AdminSponsor> {
  return authenticatedRequest<AdminSponsor>(
    `/admin/sponsors/${sponsorId}/verification`,
    {
      method: 'PATCH',
      body: JSON.stringify({ verified }),
    },
  )
}

export interface CreditTransaction {
  id: string
  sponsor_id: string
  amount: number
  transaction_type: 'purchase' | 'use' | 'refund' | 'admin_adjustment'
  description: string | null
  created_at: string
}

export interface CreditTransactionsPayload {
  transactions: CreditTransaction[]
  total: number
  sponsor: {
    id: string
    company_name: string
    current_credits: number
  }
}

export async function fetchSponsorCreditTransactions(
  sponsorId: string,
  params: {
    limit?: number
    offset?: number
  } = {},
): Promise<CreditTransactionsPayload> {
  const query = new URLSearchParams()
  if (typeof params.limit === 'number') {
    query.set('limit', String(params.limit))
  }
  if (typeof params.offset === 'number') {
    query.set('offset', String(params.offset))
  }

  const queryString = query.toString()
  const path = queryString
    ? `/admin/sponsors/${sponsorId}/transactions?${queryString}`
    : `/admin/sponsors/${sponsorId}/transactions`
  return authenticatedRequest<CreditTransactionsPayload>(path)
}

export interface AdjustCreditsPayload {
  transaction: CreditTransaction
  new_balance: number
  message: string
}

export async function adjustSponsorCredits(
  sponsorId: string,
  amount: number,
  description: string,
): Promise<AdjustCreditsPayload> {
  const query = new URLSearchParams()
  query.set('amount', String(amount))
  query.set('description', description)

  return authenticatedRequest<AdjustCreditsPayload>(
    `/admin/sponsors/${sponsorId}/credits/adjust?${query.toString()}`,
    {
      method: 'POST',
    },
  )
}
