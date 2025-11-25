/**
 * Sponsor Layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SupportWidget from '../../components/sponsor/SupportWidget'
import ImpersonationBanner from '../../components/admin/ImpersonationBanner'
import { getImpersonation, endImpersonation, ImpersonationData } from '@/lib/impersonation'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null)

  useEffect(() => {
    // Check for impersonation first
    const impersonationData = getImpersonation()
    setImpersonation(impersonationData)
    checkUser(impersonationData)
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
          alert('スポンサーが見つかりません')
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
        alert('ユーザー情報の取得に失敗しました')
        router.push('/sponsor-login')
        return
      }

      // Normal sponsor access
      if (userData.role !== 'sponsor') {
        alert('スポンサー権限が必要です')
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
          <div className="flex justify-between items-center h-16">
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
          <div className="flex gap-2 py-3">
            <a
              href="/sponsor"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg> ダッシュボード
            </a>
            <a
              href="/sponsor/themes"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg> お題管理
            </a>
            <a
              href="/sponsor/insights"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg> インサイト
            </a>
            <a
              href="/sponsor/themes/new"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg> 新規投稿
            </a>
            <a
              href="/sponsor/support"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1 inline-block">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg> サポート
            </a>
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
