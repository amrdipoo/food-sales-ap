// app/api/stock-transfer-data/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache'; // ✅ إضافة هذا السطر

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // ✅ تحديث مسار تخزين التحويلات
  revalidatePath('/dashboard/stock-transfer');

  // جلب المواقع
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, type')
    .eq('is_active', true)
    .order('type', { ascending: true });

  // جلب المنتجات النشطة
  const { data: products } = await supabase
    .from('products')
    .select('id, name, barcode')
    .eq('is_active', true)
    .order('name', { ascending: true });

  // جلب آخر 10 حركات تحويل
  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      id,
      quantity,
      notes,
      created_at,
      products (name),
      from_locations:locations!stock_movements_from_location_id_fkey (name),
      to_locations:locations!stock_movements_to_location_id_fkey (name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    locations: locations || [],
    products: products || [],
    movements: movements || []
  });
}