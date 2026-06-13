// app/actions/stockActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath, redirect } from 'next/cache';

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

export async function transferStockAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const productId = formData.get('product_id') as string;
  const fromLocationId = formData.get('from_location_id') as string;
  const toLocationId = formData.get('to_location_id') as string;
  const quantity = parseFloat(formData.get('quantity') as string);
  const notes = formData.get('notes') as string;

  console.log('🔄 محاولة تحويل المخزون:', { productId, fromLocationId, toLocationId, quantity });

  if (!productId || !fromLocationId || !toLocationId || isNaN(quantity) || quantity <= 0) {
    console.error('❌ بيانات غير صحيحة');
    return { success: false, error: 'يرجى تعبئة جميع الحقول بشكل صحيح' };
  }

  if (fromLocationId === toLocationId) {
    return { success: false, error: 'لا يمكن التحويل بين نفس الموقع' };
  }

  try {
    // 1. التحقق من توفر الكمية في موقع المصدر
    console.log('🔍 التحقق من المخزون المصدر...');
    const { data: sourceInventory, error: sourceError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', fromLocationId)
      .single();

    if (sourceError) {
      console.error('❌ خطأ في جلب مخزون المصدر:', sourceError.message);
      return { success: false, error: 'المنتج غير موجود في مخزون الموقع المصدر' };
    }

    if (!sourceInventory || sourceInventory.quantity < quantity) {
      console.error('❌ الكمية غير كافية');
      return { success: false, error: `الكمية غير متوفرة. المتاح فقط: ${sourceInventory?.quantity || 0}` };
    }

    console.log('✅ الكمية متوفرة:', sourceInventory.quantity);

    // 2. خصم الكمية من المصدر
    console.log('📉 خصم الكمية من المصدر...');
    const { error: deductError } = await supabase
      .from('inventory')
      .update({ quantity: sourceInventory.quantity - quantity })
      .eq('product_id', productId)
      .eq('location_id', fromLocationId);

    if (deductError) {
      console.error('❌ خطأ في خصم الكمية:', deductError.message);
      return { success: false, error: 'فشل في خصم الكمية: ' + deductError.message };
    }

    console.log('✅ تم خصم الكمية بنجاح');

    // 3. إضافة الكمية للوجهة
    console.log('📈 إضافة الكمية للوجهة...');
    const { data: destInventory, error: destError } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', toLocationId)
      .single();

    if (destError && destError.code !== 'PGRST116') {
      console.error('❌ خطأ في جلب مخزون الوجهة:', destError.message);
    }

    const newDestQuantity = destInventory ? (Number(destInventory.quantity) + quantity) : quantity;

    const { error: addError } = await supabase
      .from('inventory')
      .upsert({
        product_id: productId,
        location_id: toLocationId,
        quantity: newDestQuantity
      }, { onConflict: 'product_id,location_id' });

    if (addError) {
      console.error('❌ خطأ في إضافة الكمية:', addError.message);
      return { success: false, error: 'فشل في إضافة الكمية: ' + addError.message };
    }

    console.log('✅ تم إضافة الكمية للوجهة بنجاح');

    // 4. تسجيل الحركة
    console.log('📝 تسجيل الحركة...');
    const { error: logError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: quantity,
        movement_type: 'transfer_to_vehicle',
        notes: notes || null,
      });

    if (logError) {
      console.error('⚠️ تحذير: فشل تسجيل الحركة:', logError.message);
      // لا نرجع خطأ هنا لأن التحويل تم بنجاح
    } else {
      console.log('✅ تم تسجيل الحركة بنجاح');
    }

    console.log('🎉 عملية التحويل اكتملت بنجاح!');
    revalidatePath('/dashboard/stock-transfer');
    redirect('/dashboard/stock-transfer?success=true');

  } catch (error: any) {
    console.error('💥 خطأ غير متوقع:', error);
    return { success: false, error: 'خطأ غير متوقع: ' + error.message };
  }
}