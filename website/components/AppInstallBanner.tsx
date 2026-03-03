'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'

type Platform = 'ios' | 'android' | null

interface StoreConfig {
  url: string
  label: string
}

const STORE_URLS: Record<'ios' | 'android', StoreConfig> = {
  ios: {
    url: 'https://apps.apple.com/jp/app/%E3%82%88%E3%81%BF%E3%81%B3%E3%82%88%E3%82%8A/id6754638890',
    label: 'App Store',
  },
  android: {
    url: 'https://play.google.com/store/apps/details?id=com.yomibiyori.app&pcampaignid=web_share',
    label: 'Google Play',
  },
}

const BANNER_DISMISSED_KEY = 'app-install-banner-dismissed'
const DEEP_LINK_URL = 'yomibiyori://'
const TIMEOUT_MS = 2500

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null

  if (localStorage.getItem(BANNER_DISMISSED_KEY)) {
    return null
  }

  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return null
}

export function AppInstallBanner() {
  const [platform] = useState<Platform>(() => detectPlatform())
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!platform) return

    const timer = window.setTimeout(() => {
      setIsVisible(true)
      setIsAnimating(true)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [platform])

  const handleDismiss = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true')
    }, 300)
  }

  const handleOpenApp = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!platform) return

      const storeUrl = STORE_URLS[platform].url
      let isAppOpened = false

      const handleVisibilityChange = () => {
        if (document.hidden) {
          isAppOpened = true
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.location.href = DEEP_LINK_URL

      setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (!isAppOpened) {
          window.location.href = storeUrl
        }
      }, TIMEOUT_MS)
    },
    [platform],
  )

  if (!isVisible || !platform) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-xl shadow-md border-b border-[var(--color-border)] px-4 py-3">
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          <div className="flex-shrink-0">
            <Image
              src="/icon-192.png"
              alt="yomibiyori"
              width={44}
              height={44}
              className="rounded-lg shadow-sm"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[var(--color-igusa)] text-sm">よみびより</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
              アプリでもっと快適に
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleOpenApp}
              className="inline-flex items-center justify-center px-3 py-1.5 bg-[var(--color-ai)] text-white text-xs font-semibold rounded-full hover:bg-[var(--color-ai-medium)] transition-colors shadow-sm"
            >
              開く
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors"
              aria-label="閉じる"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
