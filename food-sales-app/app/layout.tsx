// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

// ✅ 1. metadata بدون themeColor
export const metadata: Metadata = {
  title: 'نظام إدارة المبيعات',
  description: 'نظام متكامل للمبيعات والمخزون',
};

// ✅ 2. themeColor ينتقل إلى viewport
export const viewport: Viewport = {
  themeColor: '#1d4ed8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}