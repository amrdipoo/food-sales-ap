// app/dashboard/products/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addProductAction, updateProductAction, deleteProductAction, toggleProductStatusAction } from '../../actions/productActions';
import ProductsClientView from './ProductsClientView';

// 1. Server Component: مسؤول عن جلب البيانات بأمان وسرعة
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

  return error ? [] : (products || []);
}

async function getLocations() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data } = await supabase
    .from('locations')
    .select('id, name, type')
    .eq('is_active', true)
    .order('type', { ascending: true });

  return data || [];
}

// المكون الرئيسي (Server Component)
export default async function ProductsPage() {
  const initialProducts = await getProductsData();
  const initialLocations = await getLocations();

  return (
    <ProductsClientView 
      initialProducts={initialProducts} 
      initialLocations={initialLocations} 
    />
  );
}