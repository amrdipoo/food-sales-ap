// app/actions/collectionActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache'; // ✅ التصحيح: الاستيراد من next/cache
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

export async function addCollectionAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const customerId = formData.get('customer_id') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const paymentMethod = formData.get('payment_method') as 'cash' | 'bank_transfer' | 'check';
  const notes = formData.get('notes') as string;

  if (!customerId || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'يرجى اختيار العميل وإدخال مبلغ صحيح' };
  }

  // 1. إدراج سجل المعاملة المالية
  const { error: transError } = await supabase
    .from('transactions')
    .insert({
      customer_id: customerId,
      amount: amount,
      transaction_type: 'collection',
      payment_method: paymentMethod,
      notes: notes || null,
    });

  if (transError) {
    console.error("❌ خطأ في حفظ المعاملة:", transError.message);
    return { success: false, error: transError.message };
  }

  // 2. تحديث رصيد العميل (خصم المبلغ المحصل من الرصيد المستحق)
  try {
    // أ) جلب الرصيد الحالي للعميل
    const { data: custData, error: fetchError } = await supabase
      .from('customers')
      .select('current_balance')
      .eq('id', customerId)
      .single();

    if (!fetchError && custData) {
      // ب) حساب الرصيد الجديد
      const currentBalance = Number(custData.current_balance || 0);
      const newBalance = currentBalance - amount;

      // ج) تحديث الرصيد في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('customers')
        .update({ current_balance: newBalance })
        .eq('id', customerId);

      if (updateError) {
        console.error("❌ خطأ في تحديث رصيد العميل:", updateError.message);
      }
    }
  } catch (error) {
    console.error("❌ خطأ غير متوقع أثناء تحديث الرصيد:", error);
  }

  // ✅ إعادة تحميل الصفحة وتحديث البيانات
  revalidatePath('/dashboard/collections');
  redirect('/dashboard/collections?success=true');
}