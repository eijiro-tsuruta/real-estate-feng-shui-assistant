import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "住まいの方位レポート | 不動産営業支援",
  description:
    "間取り図から、一般的な風水の考え方に基づく説明用レポートを作成します。",
  robots: {
    index: false,
    follow: false,
  },
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
