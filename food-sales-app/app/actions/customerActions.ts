// app/actions/customerActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

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

export async function addCustomerAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;

  const { error } = await supabase
    .from('customers')
    .insert({ name, phone, address, current_balance: 0, is_active: true });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/customers');
  return { success: true };
}

export async function toggleCustomerStatusAction(customerId: string, currentStatus: boolean) {
  const supabase = await getSupabaseClient();
  
  const { error } = await supabase
    .from('customers')
    .update({ is_active: !currentStatus })
    .eq('id', customerId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/customers');
  return { success: true };
}