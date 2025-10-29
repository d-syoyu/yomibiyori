import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "よみびより - 毎日詠む、短歌の世界",
  description: "上の句に、あなたの下の句で応える。毎日新しいお題で、言葉を紡ぐ喜びを。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSerifJP.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
