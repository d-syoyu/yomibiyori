import type { Metadata, Viewport } from "next";
import { Noto_Serif_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ToastProviderWrapper } from "@/components/providers/ToastProviderWrapper";

const GA_MEASUREMENT_ID = "G-BQQ72LNENE";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = 'https://yomibiyori.com';
const siteName = 'よみびより';
const siteDescription = '上の句に、あなたの下の句で応える。毎日新しいお題で、言葉を紡ぐ喜びを。';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - 毎日詠む、短歌の世界`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: ['短歌', 'tanka', '和歌', '詩', 'ポエム', 'SNS', '日本文化', '創作', '俳句', '文芸'],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: siteUrl,
    siteName: siteName,
    title: `${siteName} - 毎日詠む、短歌の世界`,
    description: siteDescription,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${siteName} - 詩的SNS`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteName} - 毎日詠む、短歌の世界`,
    description: siteDescription,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  category: 'technology',
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// JSON-LD structured data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      description: siteDescription,
      publisher: {
        '@id': `${siteUrl}/#organization`,
      },
      inLanguage: 'ja-JP',
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#organization`,
      name: siteName,
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/icon-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [],
    },
    {
      '@type': 'MobileApplication',
      '@id': `${siteUrl}/#app`,
      name: siteName,
      description: siteDescription,
      applicationCategory: 'SocialNetworkingApplication',
      operatingSystem: 'iOS',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'JPY',
      },
      downloadUrl: 'https://apps.apple.com/us/app/%E3%82%88%E3%81%BF%E3%81%B3%E3%82%88%E3%82%8A/id6754638890',
      softwareVersion: '1.0',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '5',
        ratingCount: '1',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${notoSerifJP.variable} antialiased`}
      >
        <ToastProviderWrapper>
          {children}
        </ToastProviderWrapper>
      </body>
    </html>
  );
}
