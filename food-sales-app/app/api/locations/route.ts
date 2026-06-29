// app/api/locations/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );

    const { data, error } = await supabase
      .from('locations')
      .select('id, name, type, assigned_rep_id, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ خطأ في جلب المواقع:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('💥 خطأ غير متوقع:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}