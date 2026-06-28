// app/actions/locationActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { validateRequired } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

export async function addLocationAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const name = formData.get('name') as string;
  const type = formData.get('type') as 'store' | 'vehicle';
  const assigned_rep_id = formData.get('assigned_rep_id') as string || null;

  const missing = validateRequired(name, 'الاسم') || validateRequired(type, 'النوع');
  if (missing) return { success: false, error: missing };

  const { error } = await supabase
    .from('locations')
    .insert({ name, type, assigned_rep_id, is_active: true });

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/locations');
  return { success: true };
}

export async function toggleLocationStatusAction(locationId: string, currentStatus: boolean) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const { error } = await supabase
    .from('locations')
    .update({ is_active: !currentStatus })
    .eq('id', locationId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/locations');
  return { success: true };
}