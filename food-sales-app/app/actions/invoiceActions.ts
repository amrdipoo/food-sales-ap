// app/actions/invoiceActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createInvoice, CreateInvoiceParams } from '../../lib/services/invoiceService';
import { revalidatePath } from 'next/cache';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );
}

async function getValidSalesRepId(): Promise<string | null> {
  const supabase = await getSupabaseClient();
  
  // 1. محاولة جلب المستخدم الحالي من الجلسة
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // 2. التحقق من وجود المستخدم في جدول users
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (userData) {
      return userData.id;
    }
  }
  
  // 3. إذا لم يكن المستخدم الحالي موجوداً، نستخدم أول مندوب نشط
  const { data: firstRep } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'sales_rep')
    .eq('is_active', true)
    .limit(1)
    .single();
  
  return firstRep?.id || null;
}

export async function submitInvoiceAction(data: CreateInvoiceParams) {
  try {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'سلة المشتريات فارغة' };
    }

    if (!data.locationId) {
      return { success: false, error: 'يرجى اختيار المخزن أو السيارة أولاً' };
    }

    // 🆕 جلب معرف مندوب صحيح
    const validSalesRepId = await getValidSalesRepId();
    
    if (!validSalesRepId) {
      return { success: false, error: 'لا يوجد مندوبين مسجلين في النظام' };
    }

    const securePayload: CreateInvoiceParams = {
      ...data,
      locationId: data.locationId,
      salesRepId: validSalesRepId, // 🆕 استخدام المعرف الصحيح
    };

    const result = await createInvoice(securePayload);

    if (result.success) {
      revalidatePath('/pos');
    }

    return result;
  } catch (error: any) {
    console.error('Server Action Error:', error);
    return { success: false, error: 'حدث خطأ في الخادم: ' + error.message };
  }
}