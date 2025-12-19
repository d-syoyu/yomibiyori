'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Platform = 'ios' | 'android' | 'desktop';

const STORE_CONFIG = {
  ios: {
    url: 'https://apps.apple.com/jp/app/短歌アプリ-よみびより/id6754638890',
    label: 'App Store',
    buttonText: 'App Storeで入手',
  },
  android: {
    url: 'https://play.google.com/store/apps/details?id=com.yomibiyori.app&pcampaignid=web_share',
    label: 'Google Play',
    buttonText: 'Google Playで入手',
  },
};

const DEEP_LINK_URL = 'yomibiyori://';
const TIMEOUT_MS = 2500;

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

function isWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line|Twitter|KAKAOTALK/i.test(ua);
}

export function DownloadClient() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [inWebView, setInWebView] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInWebView(isWebView());
    setIsLoading(false);
  }, []);

  const handleOpenApp = useCallback(() => {
    if (platform === 'desktop') return;

    setIsRedirecting(true);
    const startTime = Date.now();
    let isAppOpened = false;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isAppOpened = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    window.location.href = DEEP_LINK_URL;

    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      const elapsed = Date.now() - startTime;
      if (!isAppOpened && elapsed >= TIMEOUT_MS - 100) {
        const storeUrl =
          platform === 'ios' ? STORE_CONFIG.ios.url : STORE_CONFIG.android.url;
        window.location.href = storeUrl;
      }
      setIsRedirecting(false);
    }, TIMEOUT_MS);
  }, [platform]);

  if (isLoading) {
    return (
      <main className="flex-grow relative z-10 flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="w-24 h-24 bg-[var(--color-washi-dark)] rounded-2xl" />
        </div>
      </main>
    );
  }

  const isMobile = platform === 'ios' || platform === 'android';
  const storeConfig = isMobile ? STORE_CONFIG[platform] : null;

  return (
    <main className="flex-grow relative z-10 flex flex-col items-center justify-center px-6 py-16 min-h-screen">
      {/* ヘッダーナビゲーション */}
      <header className="absolute top-0 left-0 w-full pt-6 px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-igusa)] transition-colors text-sm"
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
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          ホームに戻る
        </Link>
      </header>

      {/* メインコンテンツ */}
      <div className="text-center space-y-8 max-w-md mx-auto w-full">
        {/* アプリアイコン */}
        <div className="flex justify-center">
          <Image
            src="/icon-192.png"
            alt="よみびより"
            width={96}
            height={96}
            className="rounded-2xl shadow-lg"
            priority
          />
        </div>

        {/* タイトル */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--color-igusa)]">
            よみびより
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            日々を詠む、詩的SNS
          </p>
        </div>

        {/* 説明文 */}
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
          毎朝届く上の句に、あなたの下の句で応える。
          <br />
          AIと共に詠む、新しい短歌体験。
        </p>

        {/* プラットフォーム別CTA */}
        {isMobile && storeConfig ? (
          <MobileCTA
            platform={platform as 'ios' | 'android'}
            storeConfig={storeConfig}
            onOpenApp={handleOpenApp}
            isRedirecting={isRedirecting}
            inWebView={inWebView}
          />
        ) : (
          <DesktopCTA />
        )}
      </div>

      {/* アプリの特徴 */}
      <section className="mt-16 max-w-md mx-auto w-full">
        <h2 className="text-center text-sm font-semibold text-[var(--color-igusa)] mb-6">
          アプリの特徴
        </h2>
        <div className="space-y-4">
          <FeatureItem
            icon="🌅"
            title="毎朝届く上の句"
            description="AIが詠む季節の上の句が、毎朝6時に届きます"
          />
          <FeatureItem
            icon="✍️"
            title="あなたの下の句で完成"
            description="一日一首、心を込めて下の句を詠みましょう"
          />
          <FeatureItem
            icon="🏆"
            title="ランキングで名作と出会う"
            description="共感を集めた作品がランキングに登場します"
          />
        </div>
      </section>

      {/* フッター */}
      <footer className="mt-16 text-center text-xs text-[var(--color-text-muted)]">
        <p>&copy; {new Date().getFullYear()} よみびより</p>
      </footer>
    </main>
  );
}

interface MobileCTAProps {
  platform: 'ios' | 'android';
  storeConfig: {
    url: string;
    label: string;
    buttonText: string;
  };
  onOpenApp: () => void;
  isRedirecting: boolean;
  inWebView: boolean;
}

function MobileCTA({
  platform,
  storeConfig,
  onOpenApp,
  isRedirecting,
  inWebView,
}: MobileCTAProps) {
  return (
    <div className="space-y-4">
      {/* インストール済みの場合のヒント */}
      {!inWebView && (
        <p className="text-xs text-[var(--color-text-muted)]">
          インストール済みの方は「アプリを開く」をタップしてください
        </p>
      )}

      {/* アプリを開くボタン（WebView以外） */}
      {!inWebView && (
        <button
          onClick={onOpenApp}
          disabled={isRedirecting}
          className="w-full py-4 px-6 bg-[var(--color-ai)] text-white font-semibold rounded-xl hover:bg-[var(--color-ai-medium)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isRedirecting ? '確認中...' : 'アプリを開く'}
        </button>
      )}

      {/* ストアリンク */}
      <a
        href={storeConfig.url}
        className="w-full py-4 px-6 bg-[var(--color-washi)] text-[var(--color-igusa)] font-semibold rounded-xl hover:bg-[var(--color-washi-dark)] transition-colors flex items-center justify-center gap-3 border border-[var(--color-border)]"
      >
        {platform === 'ios' ? <AppleIcon /> : <GooglePlayIcon />}
        {storeConfig.buttonText}
      </a>
    </div>
  );
}

function DesktopCTA() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        スマートフォンでダウンロードしてください
      </p>

      {/* ストアバッジ */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href={STORE_CONFIG.ios.url}
          className="inline-flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          <AppleIcon className="w-8 h-8" />
          <div className="text-left">
            <div className="text-[10px] leading-tight">Download on the</div>
            <div className="text-lg font-semibold leading-tight">App Store</div>
          </div>
        </a>

        <a
          href={STORE_CONFIG.android.url}
          className="inline-flex items-center gap-3 px-5 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          <GooglePlayIcon className="w-8 h-8" />
          <div className="text-left">
            <div className="text-[10px] leading-tight">GET IT ON</div>
            <div className="text-lg font-semibold leading-tight">
              Google Play
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-[var(--color-border)]">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="text-left">
        <h3 className="font-semibold text-[var(--color-igusa)] text-sm">
          {title}
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}

function AppleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GooglePlayIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
    </svg>
  );
}
