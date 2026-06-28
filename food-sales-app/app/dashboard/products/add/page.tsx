// app/dashboard/products/add/page.tsx
import { checkAccess } from '../../../actions/authActions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { addProductAction } from '../../../actions/productActions';
import AddProductForm from './AddProductForm';

// جلب المواقع النشطة لعرضها في نموذج الإضافة
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
    .order('name');

  if (error) {
    console.error('❌ خطأ في جلب المواقع:', error);
    return [];
  }
  return data || [];
}

export default async function AddProductPage() {
  // تحقق من الصلاحية
  await checkAccess('/dashboard/products');

  const locations = await getLocations();

  return (
    <div className="p-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">➕ إضافة منتج جديد</h1>
      <AddProductForm locations={locations} />
    </div>
  );
}