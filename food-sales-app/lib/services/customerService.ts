// lib/services/customerService.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  current_balance: number;
}

export async function getActiveCustomers(): Promise<Customer[]> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, address, is_active, current_balance')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ خطأ في جلب العملاء:', error.message);
    return [];
  }

  return data as Customer[];
}