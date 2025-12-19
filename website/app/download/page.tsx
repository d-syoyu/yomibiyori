import type { Metadata } from 'next';
import BackgroundDecoration from '@/components/BackgroundDecoration';
import { DownloadClient } from './DownloadClient';

export const metadata: Metadata = {
  title: 'アプリをダウンロード | よみびより',
  description:
    '短歌アプリ「よみびより」をダウンロード。iOS・Android対応。毎朝届く上の句に、あなたの下の句で応える、AIと共に詠む詩的SNS。',
  openGraph: {
    title: 'アプリをダウンロード | よみびより',
    description:
      '短歌アプリ「よみびより」をダウンロード。毎朝届く上の句に、あなたの下の句で応える。',
    url: 'https://yomibiyori.app/download',
    siteName: 'よみびより',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'アプリをダウンロード | よみびより',
    description: '短歌アプリ「よみびより」をダウンロード。iOS・Android対応。',
  },
  alternates: {
    canonical: 'https://yomibiyori.app/download',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'よみびより',
  description:
    '毎朝届く上の句に、あなたの下の句で応える。日々を詠む、詩的SNS。',
  operatingSystem: 'iOS, Android',
  applicationCategory: 'SocialNetworkingApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'JPY',
  },
  downloadUrl: [
    'https://apps.apple.com/jp/app/短歌アプリ-よみびより/id6754638890',
    'https://play.google.com/store/apps/details?id=com.yomibiyori.app',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '5',
    ratingCount: '1',
  },
};

export default function DownloadPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="page-wrapper relative overflow-hidden min-h-screen">
        <BackgroundDecoration />
        <DownloadClient />
      </div>
    </>
  );
}
