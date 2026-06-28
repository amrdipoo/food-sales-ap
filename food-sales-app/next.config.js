// next.config.js
import withPWAInit from '@ducanh2912/next-pwa';

// إعدادات PWA
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // إعدادات Turbopack (يمكنك إزالتها إذا لم تستخدمه)
  turbopack: {},

  // 🔥 السماح بالوصول من أي شبكة محلية أو أدوات النفق
  allowedDevOrigins: [
    '*.loca.lt',
    '*.ngrok.io',
    'localhost',
    '127.0.0.1',
    '192.168.*.*',   // شبكات المنزل/المكتب
    '10.*.*.*',      // شبكات VPN الداخلية
    '172.*.*.*',     // شبكات خاصة أخرى
    '*.ngrok-free.app', // ngrok الجديد
  ],

  // إعدادات CORS للـ API (اختياري، لكن مفيد)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization' },
        ],
      },
    ];
  },

};

export default withPWA(nextConfig);