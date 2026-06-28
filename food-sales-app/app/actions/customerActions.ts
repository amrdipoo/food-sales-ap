// app/actions/customerActions.ts
'use server';

// app/actions/customerActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { validateRequired } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

// ... باقي الكود

export async function addCustomerAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;

  const missing = validateRequired(name, 'الاسم');
  if (missing) return { success: false, error: missing };

  const { error } = await supabase
    .from('customers')
    .insert({ name, phone, address, current_balance: 0, is_active: true });

  if (error) {
    console.error('❌ خطأ في إضافة العميل:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/customers');
  return { success: true };
}

export async function toggleCustomerStatusAction(customerId: string, currentStatus: boolean) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const { error } = await supabase
    .from('customers')
    .update({ is_active: !currentStatus })
    .eq('id', customerId);

  if (error) {
    console.error('❌ خطأ في تغيير حالة العميل:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/customers');
  return { success: true };
}