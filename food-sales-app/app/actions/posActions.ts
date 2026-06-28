// app/actions/posActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { getCurrentUserAction } from './userActions';

export async function getPosInitialData() {
  const supabase = await getServerSupabaseClient();

  const [userData, customersRes, locationsRes] = await Promise.all([
    getCurrentUserAction(),
    supabase.from('customers').select('id, name, phone').eq('is_active', true).order('name'),
    supabase.from('locations').select('id, name, type').eq('is_active', true).order('name'),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  return {
    user: userData || { id: user?.id, full_name: user?.email || 'مستخدم', role: 'user' },
    customers: customersRes.data || [],
    locations: locationsRes.data || [],
  };
}

export async function getActiveLocations() {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, type')
    .eq('is_active', true)
    .order('name');

  return error ? [] : (data || []);
}