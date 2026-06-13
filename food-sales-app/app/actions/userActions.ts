// app/actions/userActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';       // ✅ التصحيح: من next/cache
import { redirect } from 'next/navigation';        // ✅ redirect من next/navigation

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

export async function addUserAction(formData: FormData) {
  const supabase = await getSupabaseClient();
  
  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const role = formData.get('role') as 'admin' | 'store_manager' | 'sales_rep';
  const password = (formData.get('password') as string) || '12345678';

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  if (authData.user) {
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        full_name,
        role,
        phone,
        is_active: true,
      });

    if (dbError) {
      return { success: false, error: dbError.message };
    }
  }

  revalidatePath('/dashboard/users');
  redirect('/dashboard/users?success=true');
}

export async function toggleUserStatusAction(userId: string, currentStatus: boolean) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ is_active: !currentStatus })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/dashboard/users');
  redirect('/dashboard/users');
}

export async function getCurrentUserAction() {
  const supabase = await getSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('id', user.id)
    .single();
  
  return userData || { id: user.id, email: user.email, full_name: user.email };
}