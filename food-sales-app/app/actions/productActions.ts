// app/actions/productActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber, validateRequired } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUserRole } from './authActions';

export async function addProductAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const barcode = formData.get('barcode') as string;
  const unit_type = formData.get('unit_type') as string;
  const cost_price = parseNumber(formData.get('cost_price'));
  const unit_price = parseNumber(formData.get('unit_price'));

  const missing = validateRequired(name, 'الاسم') ||
                  validateRequired(barcode, 'الباركود') ||
                  (unit_price <= 0 ? 'سعر البيع يجب أن يكون أكبر من صفر' : null);
  if (missing) return { success: false, error: missing };

  try {
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .insert({ name, category, barcode, unit_type, cost_price, unit_price, is_active: true })
      .select('id')
      .single();

    if (productError) throw new Error(productError.message);
    if (!newProduct) throw new Error('فشل إضافة المنتج');

    const locationIds = formData.getAll('location_id') as string[];
    const quantities = formData.getAll('quantity') as string[];
    const inventoryInserts = [];

    for (let i = 0; i < locationIds.length; i++) {
      const locId = locationIds[i];
      const qty = parseNumber(quantities[i]);
      if (locId && qty > 0) {
        inventoryInserts.push({
          product_id: newProduct.id,
          location_id: locId,
          quantity: qty,
        });
      }
    }

    if (inventoryInserts.length > 0) {
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert(inventoryInserts);

      if (inventoryError) throw new Error('فشل إضافة المخزون: ' + inventoryError.message);
    }

    revalidatePath('/dashboard/products');
    redirect('/dashboard/products');
  } catch (error: any) {
    console.error('❌ خطأ في إضافة المنتج:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleProductStatusAction(productId: string, currentStatus: boolean) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const { error } = await supabase
    .from('products')
    .update({ is_active: !currentStatus })
    .eq('id', productId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}

export async function updateProductAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const barcode = formData.get('barcode') as string;
  const unit_type = formData.get('unit_type') as string;
  const cost_price = parseNumber(formData.get('cost_price'));
  const unit_price = parseNumber(formData.get('unit_price'));

  const { error } = await supabase
    .from('products')
    .update({ name, category, barcode, unit_type, cost_price, unit_price })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}

export async function deleteProductAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const productId = formData.get('productId') as string;
  if (!productId) return { success: false, error: 'معرف المنتج مطلوب' };

  const { data: inventory, error: invError } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', productId);

  if (invError) return { success: false, error: invError.message };

  const totalQuantity = inventory?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

  if (totalQuantity > 0) {
    return {
      success: false,
      error: `⛔ لا يمكن حذف هذا الصنف لوجود مخزون متبقي (${totalQuantity}). يرجى جرد أو تحويل المخزون أولاً.`,
    };
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/products');
  return { success: true };
}