import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Віртуальне міністерство — уряди України через соціоніку",
  description:
    "Гра-симулятор: реальні уряди України 2005–2026 прогнано через алгоритм «Пульсу мережі» — компетентність, соціонічні типи, інтертипні відносини. Зберіть свій уряд і порівняйте його з історією.",
  keywords: ["соціоніка", "кабмін", "Україна", "симулятор", "інтертипні відносини", "уряд", "гра"],
};

export const viewport: Viewport = {
  themeColor: "#0a1022",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
