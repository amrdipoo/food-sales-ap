// next.config.mjs
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // إضافة تكوين Turbopack فارغ لتجنب الخطأ
  turbopack: {},
};

export default withPWA(nextConfig);