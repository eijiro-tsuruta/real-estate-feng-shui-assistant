import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rain AI | おうち風水 — LINEで住まいの相談をもっと具体的に",
  description:
    "建物間取り風水、お部屋の配置アドバイス、壁の完成イメージをLINEで。不動産・住宅・リフォームのお客様提案をAIが支えます。",
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
