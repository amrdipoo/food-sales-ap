// app/actions/productActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }); } catch (e) {}
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }); } catch (e) {}
        },
      },
    }
  );
}

export async function addProductAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const barcode = formData.get('barcode') as string;
  const unit_type = formData.get('unit_type') as string;
  const cost_price = parseFloat(formData.get('cost_price') as string) || 0;
  const unit_price = parseFloat(formData.get('unit_price') as string) || 0;

  if (!name || !barcode || unit_price <= 0) {
    return { success: false, error: 'يرجى إدخال اسم المنتج، الباركود، وسعر البيع بشكل صحيح' };
  }

  // 1. إضافة المنتج
  const { data: newProduct, error: productError } = await supabase
    .from('products')
    .insert({ name, category, barcode, unit_type, cost_price, unit_price, is_active: true })
    .select('id')
    .single();

  if (productError || !newProduct) {
    return { success: false, error: productError?.message || 'فشل في إضافة المنتج' };
  }

  // 2. ✅ قراءة جميع المواقع والكميات كمصفوفات
  const locationIds = formData.getAll('location_id') as string[];
  const quantities = formData.getAll('quantity') as string[];

  console.log('📍 المواقع المختارة:', locationIds);
  console.log('📦 الكميات:', quantities);

  // 3. ✅ بناء سجلات المخزون
  const inventoryInserts = [];
  for (let i = 0; i < locationIds.length; i++) {
    const locId = locationIds[i];
    const qty = parseFloat(quantities[i]);
    
    if (locId && qty > 0) {
      inventoryInserts.push({
        product_id: newProduct.id,
        location_id: locId,
        quantity: qty
      });
    }
  }

  // 4. ✅ إدراج سجلات المخزون
  if (inventoryInserts.length > 0) {
    console.log('📝 إدراج المخزون:', inventoryInserts);
    const { error: inventoryError } = await supabase
      .from('inventory')
      .insert(inventoryInserts);

    if (inventoryError) {
      console.error('❌ فشل في إضافة المخزون:', inventoryError.message);
    } else {
      console.log('✅ تم إضافة المخزون بنجاح');
    }
  }

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}

export async function toggleProductStatusAction(productId: string, currentStatus: boolean) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('products')
    .update({ is_active: !currentStatus })
    .eq('id', productId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}
// app/actions/productActions.ts

// ✅ دالة تحديث بيانات المنتج
export async function updateProductAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const barcode = formData.get('barcode') as string;
  const unit_type = formData.get('unit_type') as string;
  const cost_price = parseFloat(formData.get('cost_price') as string) || 0;
  const unit_price = parseFloat(formData.get('unit_price') as string) || 0;

  const { error } = await supabase
    .from('products')
    .update({ name, category, barcode, unit_type, cost_price, unit_price })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}

// ✅ دالة حذف المنتج مع التحقق من الحركات
export async function deleteProductAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  const productId = formData.get('productId') as string;

  // 1️⃣ التحقق من الفواتير
  const { count: invoiceCount } = await supabase
    .from('invoice_items')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (invoiceCount && invoiceCount > 0) {
    return { success: false, error: '🚫 لا يمكن الحذف: الصنف تم بيعه في فواتير سابقة.' };
  }

  // 2️⃣ التحقق من حركات المخزون
  const { count: movementCount } = await supabase
    .from('stock_movements')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (movementCount && movementCount > 0) {
    return { success: false, error: '🚫 لا يمكن الحذف: الصنف له حركات تحويل أو إضافة سابقة.' };
  }

  // 3️⃣ التحقق من المخزون الحالي
  const { data: inventoryData } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', productId);
  
  const totalStock = inventoryData?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;
  if (totalStock > 0) {
    return { success: false, error: `🚫 لا يمكن الحذف: يوجد مخزون متبقي (${totalStock}). يرجى تصفير المخزون أولاً عبر شاشة التحويل.` };
  }

  // ✅ إذا عبر جميع الفحوصات، نحذفه
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}