// app/dashboard/products/page.tsx
import { checkAccess } from '../../actions/authActions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ProductsClientView from './ProductsClientView';
export const dynamic = 'force-dynamic';
// ✅ دالة جلب المنتجات
async function getProductsData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, name, category, barcode, unit_type, unit_price, cost_price, is_active,
      inventory ( quantity, locations ( id, name, type ) )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ خطأ في جلب المنتجات:', error);
    return [];
  }
  return products || [];
}

// ✅ دالة جلب المواقع
async function getLocations() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from('locations')
    .select('id, name, type')
    .eq('is_active', true)
    .order('type', { ascending: true });

  if (error) {
    console.error('❌ خطأ في جلب المواقع:', error);
    return [];
  }
  return data || [];
}

// ✅ التصدير الوحيد (الافتراضي)
export default async function ProductsPage() {
  // تحقق من الصلاحية
  await checkAccess('/dashboard/products');

  // جلب البيانات
  const initialProducts = await getProductsData();
  const initialLocations = await getLocations();

  return (
    <ProductsClientView
      initialProducts={initialProducts}
      initialLocations={initialLocations}
    />
  );
}