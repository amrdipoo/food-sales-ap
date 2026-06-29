// app/actions/stockActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber, validateRequired } from '@/lib/utils'; // ✅ استيراد من utils
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

export async function transferStockAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const productId = formData.get('product_id') as string;
  const fromLocationId = formData.get('from_location_id') as string;
  const toLocationId = formData.get('to_location_id') as string;
  const quantity = parseNumber(formData.get('quantity'));
  const notes = formData.get('notes') as string;

  const missing = validateRequired(productId, 'المنتج') ||
                  validateRequired(fromLocationId, 'الموقع المصدر') ||
                  validateRequired(toLocationId, 'الموقع الوجهة') ||
                  (quantity <= 0 ? 'الكمية يجب أن تكون أكبر من صفر' : null);
  if (missing) return { success: false, error: missing };

  if (fromLocationId === toLocationId) {
    return { success: false, error: 'لا يمكن التحويل بين نفس الموقع' };
  }

  try {
    // التحقق من المخزون المصدر
    const { data: sourceInventory, error: sourceError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', fromLocationId)
      .maybeSingle();

    if (sourceError || !sourceInventory) {
      throw new Error('المنتج غير موجود في الموقع المصدر');
    }

    if (sourceInventory.quantity < quantity) {
      throw new Error(`الكمية غير كافية (المتاح: ${sourceInventory.quantity})`);
    }

    // خصم من المصدر
    const { error: deductError } = await supabase
      .from('inventory')
      .update({ quantity: sourceInventory.quantity - quantity })
      .eq('product_id', productId)
      .eq('location_id', fromLocationId);

    if (deductError) throw new Error('فشل خصم الكمية: ' + deductError.message);

    // إضافة للوجهة
    const { data: destInventory } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', toLocationId)
      .maybeSingle();

    const newDestQty = destInventory ? Number(destInventory.quantity) + quantity : quantity;

    const { error: upsertError } = await supabase
      .from('inventory')
      .upsert(
        { product_id: productId, location_id: toLocationId, quantity: newDestQty },
        { onConflict: 'product_id,location_id' }
      );

    if (upsertError) throw new Error('فشل إضافة الكمية للوجهة: ' + upsertError.message);

    // تسجيل الحركة
    await supabase.from('stock_movements').insert({
      product_id: productId,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      quantity,
      movement_type: 'transfer',
      notes: notes || null,
    });

    revalidatePath('/dashboard/stock-transfer');
    return { success: true, message: 'تم تحويل المخزون بنجاح' };

  } catch (error: any) {
    console.error('💥 خطأ في التحويل:', error);
    return { success: false, error: error.message };
  }
}