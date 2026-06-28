// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // ✅ هذا السطر هو الأهم: يجبر Supabase على استخدام رابط URL بدلاً من الكوكيز المباشرة
        flowType: 'pkce', 
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        cookieOptions: {
          name: 'sb-auth-token',
          path: '/',
          sameSite: 'lax', // أكثر أماناً وتوافقاً مع الموبايل من 'none'
          secure: process.env.NODE_ENV === 'production',
        },
      },
    }
  );
}