// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "تطبيق مندوب المبيعات",
  description: "نظام إدارة المبيعات والتوزيع",
  manifest: "/manifest.json", // Next.js سيضيف هذا الرابط تلقائياً في <head>
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "المندوب",
  },
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}