// lib/supabase.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ✅ إزالة استيراد Database واستخدام any بدلاً من ذلك
export async function getServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          try { cookieStore.set({ name, value, ...options }); } catch (_) {}
        },
        remove: (name: string, options: any) => {
          try { cookieStore.set({ name, value: '', ...options }); } catch (_) {}
        },
      },
    }
  );
}