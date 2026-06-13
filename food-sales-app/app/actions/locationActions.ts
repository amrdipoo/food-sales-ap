// app/actions/locationActions.ts
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

export async function addLocationAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const name = formData.get('name') as string;
  const type = formData.get('type') as 'store' | 'vehicle';
  const assigned_rep_id = formData.get('assigned_rep_id') as string || null;

  const { error } = await supabase
    .from('locations')
    .insert({ name, type, assigned_rep_id, is_active: true });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/locations');
  return { success: true };
}

export async function toggleLocationStatusAction(locationId: string, currentStatus: boolean) {
  const supabase = await getSupabaseClient();
  
  const { error } = await supabase
    .from('locations')
    .update({ is_active: !currentStatus })
    .eq('id', locationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/locations');
  return { success: true };
}