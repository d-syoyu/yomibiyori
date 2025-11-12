/**
 * Admin Layout
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

export default function AdminLayout({
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
        router.push('/login')
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
        router.push('/login')
        return
      }

      // Check if user is admin
      if (userData.role !== 'admin') {
        alert('管理者権限が必要です')
        router.push('/login')
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
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-pink-50">
        <div className="text-amber-900">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--color-washi)]">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                よみびより 管理画面
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {user.display_name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn-secondary px-4 py-2"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/70 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3 text-[var(--color-text-secondary)]">
            <a
              href="/admin"
              className="px-3 py-2 text-sm font-medium hover:text-[var(--color-accent)] hover:bg-[rgba(26,54,93,0.06)] rounded-lg transition-colors"
            >
              ダッシュボード
            </a>
            <a
              href="/admin/themes"
              className="px-3 py-2 text-sm font-medium hover:text-[var(--color-accent)] hover:bg-[rgba(26,54,93,0.06)] rounded-lg transition-colors"
            >
              お題審査
            </a>
            <a
              href="/admin/sponsors"
              className="px-3 py-2 text-sm font-medium hover:text-[var(--color-accent)] hover:bg-[rgba(26,54,93,0.06)] rounded-lg transition-colors"
            >
              スポンサー承認
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
