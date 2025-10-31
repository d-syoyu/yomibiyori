/**
 * Admin Dashboard
 */

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Stats {
  totalThemes: number
  pendingThemes: number
  approvedThemes: number
  rejectedThemes: number
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<Stats>({
    totalThemes: 0,
    pendingThemes: 0,
    approvedThemes: 0,
    rejectedThemes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [searchParams])

  async function loadStats() {
    try {
      const [
        { data: total },
        { data: pending },
        { data: approved },
        { data: rejected },
      ] = await Promise.all([
        supabase.from('sponsor_themes').select('id'),
        supabase.from('sponsor_themes').select('id').eq('status', 'pending'),
        supabase.from('sponsor_themes').select('id').eq('status', 'approved'),
        supabase.from('sponsor_themes').select('id').eq('status', 'rejected'),
      ])

      setStats({
        totalThemes: total?.length || 0,
        pendingThemes: pending?.length || 0,
        approvedThemes: approved?.length || 0,
        rejectedThemes: rejected?.length || 0,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: '審査待ちお題',
      value: stats.pendingThemes,
      color: 'from-yellow-400 to-orange-500',
      href: '/admin/themes?status=pending',
    },
    {
      label: '承認済みお題',
      value: stats.approvedThemes,
      color: 'from-green-400 to-emerald-500',
      href: '/admin/themes?status=approved',
    },
    {
      label: '却下お題',
      value: stats.rejectedThemes,
      color: 'from-red-400 to-pink-500',
      href: '/admin/themes?status=rejected',
    },
    {
      label: '総お題数',
      value: stats.totalThemes,
      color: 'from-blue-400 to-indigo-500',
      href: '/admin/themes',
    },
  ]

  if (loading) {
    return <div className="text-amber-900">読み込み中...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          ダッシュボード
        </h1>
        <p className="text-amber-700">
          スポンサーお題の管理状況を確認できます
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="block group"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div
                className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${card.color} mb-4`}
              >
                <span className="text-white text-2xl font-bold">
                  {card.value}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-amber-900 group-hover:text-amber-700 transition-colors">
                {card.label}
              </h3>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-100 shadow-lg">
        <h2 className="text-xl font-bold text-amber-900 mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/themes?status=pending"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 hover:border-yellow-300 transition-all group"
          >
            <span className="font-medium text-yellow-900">
              審査待ちお題を確認
            </span>
            <span className="text-yellow-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </a>
          <a
            href="/admin/themes"
            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 hover:border-purple-300 transition-all group"
          >
            <span className="font-medium text-purple-900">
              全てのお題を表示
            </span>
            <span className="text-purple-600 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="text-amber-900">読み込み中...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
