'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type Platform = 'ios' | 'android' | null;

interface StoreConfig {
  url: string;
  label: string;
}

const STORE_URLS: Record<'ios' | 'android', StoreConfig> = {
  ios: {
    url: 'https://apps.apple.com/jp/app/短歌アプリ-よみびより/id6754638890',
    label: 'App Store',
  },
  android: {
    url: 'https://play.google.com/store/apps/details?id=com.yomibiyori.app&pcampaignid=web_share',
    label: 'Google Play',
  },
};

const BANNER_DISMISSED_KEY = 'app-install-banner-dismissed';

export function AppInstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // すでに閉じている場合は表示しない
    if (typeof window !== 'undefined' && localStorage.getItem(BANNER_DISMISSED_KEY)) {
      return;
    }

    const ua = navigator.userAgent;

    // iOS検出（iPhone, iPad, iPod）
    // Safariにはネイティブバナーがあるが、Chrome等では表示されないのでカスタムバナーを表示
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setPlatform('ios');
      // 少し遅延させてアニメーション表示
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1500);
    }
    // Android検出
    else if (/Android/i.test(ua) && STORE_URLS.android.url) {
      setPlatform('android');
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1500);
    }
  }, []);

  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    }, 300);
  };

  if (!isVisible || !platform) return null;

  const store = STORE_URLS[platform];

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
        isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-xl shadow-md border-b border-[var(--color-border)] px-4 py-3">
        <div className="max-w-screen-lg mx-auto flex items-center gap-3">
          {/* アプリアイコン */}
          <div className="flex-shrink-0">
            <Image
              src="/icon-192.png"
              alt="よみびより"
              width={44}
              height={44}
              className="rounded-lg shadow-sm"
            />
          </div>

          {/* テキスト */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[var(--color-igusa)] text-sm">
              よみびより
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-snug">
              アプリでもっと便利に
            </p>
          </div>

          {/* ボタン群 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={store.url}
              className="inline-flex items-center justify-center px-3 py-1.5 bg-[var(--color-ai)] text-white text-xs font-semibold rounded-full hover:bg-[var(--color-ai-medium)] transition-colors shadow-sm"
            >
              開く
            </a>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
