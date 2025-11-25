'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getImpersonation, endImpersonation, ImpersonationData } from '@/lib/impersonation'

export default function ImpersonationBanner() {
  const router = useRouter()
  const [impersonation, setImpersonation] = useState<ImpersonationData | null>(null)

  useEffect(() => {
    setImpersonation(getImpersonation())
  }, [])

  if (!impersonation) return null

  function handleEndImpersonation() {
    endImpersonation()
    router.push('/admin/sponsors')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="font-bold">なりすましモード</span>
            </div>
            <span className="text-white/80">|</span>
            <span className="text-sm">
              <span className="font-semibold">{impersonation.sponsorName}</span> として表示中
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/sponsors"
              className="text-sm text-white/80 hover:text-white transition-colors underline"
            >
              管理画面に戻る
            </a>
            <button
              onClick={handleEndImpersonation}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              終了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
