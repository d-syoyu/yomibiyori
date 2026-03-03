'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { endImpersonation, getImpersonation } from '@/lib/impersonation'

export default function ImpersonationBanner() {
  const router = useRouter()
  const impersonation = getImpersonation()

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
            <span className="font-bold">Impersonation Mode</span>
            <span className="text-white/80">|</span>
            <span className="text-sm">
              Viewing as <span className="font-semibold">{impersonation.sponsorName}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/sponsors"
              className="text-sm text-white/80 hover:text-white transition-colors underline"
            >
              Back to Admin
            </Link>
            <button
              onClick={handleEndImpersonation}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
