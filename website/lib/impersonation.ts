/**
 * Impersonation utilities for admin users
 * Allows admins to view sponsor dashboards as if they were the sponsor
 */

const IMPERSONATION_KEY = 'admin_impersonation'

export interface ImpersonationData {
  sponsorId: string
  sponsorName: string
  adminId: string
  startedAt: string
}

export function startImpersonation(data: Omit<ImpersonationData, 'startedAt'>): void {
  if (typeof window === 'undefined') return

  const impersonationData: ImpersonationData = {
    ...data,
    startedAt: new Date().toISOString(),
  }

  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonationData))
}

export function getImpersonation(): ImpersonationData | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(IMPERSONATION_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as ImpersonationData
  } catch {
    return null
  }
}

export function endImpersonation(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IMPERSONATION_KEY)
}

export function isImpersonating(): boolean {
  return getImpersonation() !== null
}
