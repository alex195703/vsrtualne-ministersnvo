import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Виртуальное министерство — кабмины Украины через соционику",
  description:
    "Игра-симулятор: реальные правительства Украины 2005–2026 прогнаны через алгоритм «Пульса сети» — компетентность, соционические типы, интертипные отношения. Соберите свой кабинет и сравните его с историей.",
  keywords: ["соционика", "кабмин", "Украина", "симулятор", "интертипные отношения", "правительство", "игра"],
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
    <html lang="ru" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
