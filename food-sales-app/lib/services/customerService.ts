// lib/services/customerService.ts
import { supabase } from '../supabaseClient';

export interface Customer {
  id: string;
  name: string;
}

export async function getActiveCustomers(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
}