/**
 * Sponsor Layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()

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

      // Check if user is sponsor
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
      router.push('/sponsor/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
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
    <div className="page-wrapper">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[var(--color-border)] sticky top-0 z-10">
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
                ログアウト
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
              📊 ダッシュボード
            </a>
            <a
              href="/sponsor/themes"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              📝 お題管理
            </a>
            <a
              href="/sponsor/insights"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              📈 インサイト
            </a>
            <a
              href="/sponsor/themes/new"
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-igusa)] hover:bg-[var(--color-washi)] rounded-lg transition-colors"
            >
              ✨ 新規投稿
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="page-container py-8">
        {children}
      </main>
    </div>
  )
}
