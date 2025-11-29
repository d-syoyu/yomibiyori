import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "スポンサー登録",
  description: "よみびよりのスポンサーとして登録し、上の句を投稿して全国の詠み人と一緒に短歌を完成させましょう。",
  robots: {
    index: true,
    follow: true,
  },
};

export default function SponsorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
