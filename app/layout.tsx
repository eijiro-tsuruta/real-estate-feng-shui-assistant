import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "住まいの方位レポート | 間取りから、会話のきっかけを。",
  description:
    "間取り図から、一般的な風水の考え方に基づく説明用レポートを作成します。",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
