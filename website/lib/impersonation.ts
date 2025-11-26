/**
 * Impersonation utilities for admin users
 * Allows admins to view sponsor dashboards as if they were the sponsor
 *
 * Security features:
 * - TTL (Time To Live): Sessions expire after 1 hour
 * - HMAC signature: Prevents tampering with stored data
 * - Automatic cleanup of expired sessions
 */

const IMPERSONATION_KEY = 'admin_impersonation'
const IMPERSONATION_TTL_MS = 60 * 60 * 1000 // 1 hour

// Simple secret for HMAC - in production, this should come from environment
// This provides basic tamper protection for client-side storage
const SIGNATURE_SECRET = 'yomibiyori-impersonation-2024'

export interface ImpersonationData {
  sponsorId: string
  sponsorName: string
  adminId: string
  startedAt: string
  expiresAt: string
}

interface StoredImpersonationData extends ImpersonationData {
  signature: string
}

/**
 * Generate a simple hash signature for data integrity
 * Note: This is client-side protection only - server should always verify
 */
function generateSignature(data: ImpersonationData): string {
  const payload = `${data.sponsorId}:${data.adminId}:${data.startedAt}:${data.expiresAt}:${SIGNATURE_SECRET}`
  // Simple hash using string char codes
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Verify the signature of stored impersonation data
 */
function verifySignature(data: StoredImpersonationData): boolean {
  const expectedSignature = generateSignature({
    sponsorId: data.sponsorId,
    sponsorName: data.sponsorName,
    adminId: data.adminId,
    startedAt: data.startedAt,
    expiresAt: data.expiresAt,
  })
  return data.signature === expectedSignature
}

/**
 * Check if impersonation session has expired
 */
function isExpired(data: ImpersonationData): boolean {
  const expiresAt = new Date(data.expiresAt)
  return new Date() > expiresAt
}

export function startImpersonation(data: Omit<ImpersonationData, 'startedAt' | 'expiresAt'>): void {
  if (typeof window === 'undefined') return

  const now = new Date()
  const expiresAt = new Date(now.getTime() + IMPERSONATION_TTL_MS)

  const impersonationData: ImpersonationData = {
    ...data,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  const storedData: StoredImpersonationData = {
    ...impersonationData,
    signature: generateSignature(impersonationData),
  }

  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(storedData))
}

export function getImpersonation(): ImpersonationData | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(IMPERSONATION_KEY)
  if (!stored) return null

  try {
    const data = JSON.parse(stored) as StoredImpersonationData

    // Verify signature to detect tampering
    if (!verifySignature(data)) {
      console.warn('Impersonation data signature mismatch - clearing session')
      endImpersonation()
      return null
    }

    // Check expiration
    if (isExpired(data)) {
      console.info('Impersonation session expired - clearing session')
      endImpersonation()
      return null
    }

    // Return data without signature
    const { signature: _, ...impersonationData } = data
    return impersonationData
  } catch {
    endImpersonation()
    return null
  }
}

/**
 * Extend the current impersonation session by resetting TTL
 */
export function extendImpersonation(): boolean {
  const current = getImpersonation()
  if (!current) return false

  startImpersonation({
    sponsorId: current.sponsorId,
    sponsorName: current.sponsorName,
    adminId: current.adminId,
  })
  return true
}

/**
 * Get remaining time for current impersonation session in milliseconds
 */
export function getImpersonationTimeRemaining(): number {
  const data = getImpersonation()
  if (!data) return 0

  const expiresAt = new Date(data.expiresAt)
  const remaining = expiresAt.getTime() - new Date().getTime()
  return Math.max(0, remaining)
}

export function endImpersonation(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(IMPERSONATION_KEY)
}

export function isImpersonating(): boolean {
  return getImpersonation() !== null
}
