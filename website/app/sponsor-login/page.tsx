/**
 * Login Page for Sponsor Panel
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BackgroundDecoration from '@/components/BackgroundDecoration'

export default function SponsorLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Sign in with password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      if (!data.user) throw new Error('ログインに失敗しました')

      // Check user role from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        console.error('Failed to fetch user data:', userError)
        throw new Error('ユーザー情報の取得に失敗しました')
      }

      if (userData.role !== 'sponsor') {
        await supabase.auth.signOut()
        throw new Error('スポンサー権限が必要です')
      }

      // Redirect to sponsor page
      router.push('/sponsor')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper relative overflow-hidden">
      <BackgroundDecoration />
      <div className="page-container flex justify-center">
        <div className="content-card w-full max-w-md">
          <div className="text-center space-y-2 mb-6">
            <span className="badge">スポンサー向け</span>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">よみびより</h1>
            <p className="text-[var(--color-text-secondary)]">スポンサー管理画面</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all"
                placeholder="sponsor@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
            スポンサーアカウントでログインしてください
          </p>
        </div>
      </div>
    </div>
  )
}
