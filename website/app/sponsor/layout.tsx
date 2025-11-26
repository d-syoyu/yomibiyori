/**
 * Sponsor Layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SupportWidget from '../../components/sponsor/SupportWidget'
import ImpersonationBanner from '../../components/admin/ImpersonationBanner'
import { NavLink, SPONSOR_NAV_ITEMS } from '../../components/ui/NavLink'
import { getImpersonation, endImpersonation, ImpersonationData } from '@/lib/impersonation'
import { useToast } from '@/lib/hooks/useToast'

interface User {
  id: string
  email: string
  role: string
  display_name: string
}

export default function SponsorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null)

  useEffect(() => {
    // Check for impersonation first
    const impersonationData = getImpersonation()
    setImpersonation(impersonationData)
    checkUser(impersonationData)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkUser(impersonationData: ImpersonationData | null) {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

      // If impersonating, handle admin access first
      if (impersonationData) {
        // Admin is impersonating - verify sponsor exists and allow access
        const { data: sponsorData } = await supabase
          .from('sponsors')
          .select('id, company_name')
          .eq('id', impersonationData.sponsorId)
          .single()

        if (sponsorData) {
          // Valid impersonation - set user as the sponsor
          setUser({
            id: impersonationData.sponsorId,
            email: session?.user?.email || 'admin@example.com',
            role: 'sponsor',
            display_name: sponsorData.company_name,
          })
          setLoading(false)
          return
        } else {
          // Sponsor not found, end impersonation
          endImpersonation()
          setImpersonation(null)
          toast.error('スポンサーが見つかりません')
          router.push('/admin/sponsors')
          return
        }
      }

      // Normal flow - require session for non-impersonation access
      if (!session) {
        router.push('/sponsor-login')
        return
      }

      // Get user role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, name')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.error('Failed to fetch user data:', userError)
        toast.error('ユーザー情報の取得に失敗しました')
        router.push('/sponsor-login')
        return
      }

      // Normal sponsor access
      if (userData.role !== 'sponsor') {
        toast.error('スポンサー権限が必要です')
        router.push('/sponsor-login')
        return
      }

      setUser({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        display_name: userData.name || userData.email,
      })
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/sponsor-login')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    // If impersonating, just end impersonation
    if (impersonation) {
      endImpersonation()
      router.push('/admin/sponsors')
      return
    }
    await supabase.auth.signOut()
    router.push('/sponsor-login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-washi)]">
        <div className="text-[var(--color-text-secondary)]">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className={`page-wrapper ${impersonation ? 'pt-[52px]' : ''}`}>
      {/* Impersonation Banner */}
      {impersonation && <ImpersonationBanner />}

      {/* Header */}
      <header className={`bg-white/80 backdrop-blur-sm border-b border-[var(--color-border)] sticky z-40 ${impersonation ? 'top-[52px]' : 'top-0'}`}>
        <div className="page-container">
          <div className="flex flex-col md:flex-row justify-between items-center min-h-16 py-2 gap-2">
            <div className="flex items-center gap-4">
              <a href="/" className="text-2xl font-bold text-[var(--color-igusa)] font-serif hover:text-[var(--color-igusa-light)] transition-colors">
                よみびより
              </a>
              <span className="text-sm text-[var(--color-text-muted)] border-l border-[var(--color-border)] pl-4">
                スポンサー管理
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {user.display_name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
              >
                {impersonation ? '終了' : 'ログアウト'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="page-container">
          <div className="flex gap-2 py-3 overflow-x-auto whitespace-nowrap">
            {SPONSOR_NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.icon} {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="page-container py-8">
        {children}
      </main>
      <SupportWidget />
    </div>
  )
}
