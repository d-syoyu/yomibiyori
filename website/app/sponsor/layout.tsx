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
        router.push('/sponsor/login')
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
        router.push('/sponsor/login')
        return
      }

      // Check if user is sponsor
      if (userData.role !== 'sponsor') {
        alert('スポンサー権限が必要です')
        router.push('/sponsor/login')
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
    router.push('/sponsor/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-purple-900">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-purple-900">
                よみびより スポンサー管理
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-purple-700">
                {user.display_name || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 py-3">
            <a
              href="/sponsor"
              className="px-3 py-2 text-sm font-medium text-purple-900 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
              ダッシュボード
            </a>
            <a
              href="/sponsor/themes"
              className="px-3 py-2 text-sm font-medium text-purple-900 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
              お題管理
            </a>
            <a
              href="/sponsor/themes/new"
              className="px-3 py-2 text-sm font-medium text-purple-900 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
              新規投稿
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
