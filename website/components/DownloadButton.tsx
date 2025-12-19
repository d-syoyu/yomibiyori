'use client';

import { useCallback } from 'react';

const STORE_CONFIG = {
  ios: 'https://apps.apple.com/jp/app/短歌アプリ-よみびより/id6754638890',
  android:
    'https://play.google.com/store/apps/details?id=com.yomibiyori.app&pcampaignid=web_share',
};

const DEEP_LINK_URL = 'yomibiyori://';
const TIMEOUT_MS = 2500;

type Platform = 'ios' | 'android' | 'desktop';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'ios';
  }

  if (/Android/i.test(ua)) {
    return 'android';
  }

  return 'desktop';
}

interface DownloadButtonProps {
  className?: string;
  children: React.ReactNode;
}

export function DownloadButton({ className, children }: DownloadButtonProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const platform = detectPlatform();

      // デスクトップの場合は/downloadページへ
      if (platform === 'desktop') {
        return; // デフォルトのリンク動作（/downloadへ遷移）
      }

      // モバイルの場合はディープリンクを試行
      e.preventDefault();

      const storeUrl =
        platform === 'ios' ? STORE_CONFIG.ios : STORE_CONFIG.android;

      let isAppOpened = false;

      const handleVisibilityChange = () => {
        if (document.hidden) {
          isAppOpened = true;
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // ディープリンクを試行
      window.location.href = DEEP_LINK_URL;

      // タイムアウト後にストアへリダイレクト
      setTimeout(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);

        if (!isAppOpened) {
          window.location.href = storeUrl;
        }
      }, TIMEOUT_MS);
    },
    []
  );

  return (
    <a href="/download" onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
