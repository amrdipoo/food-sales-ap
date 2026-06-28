// app/actions/authActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export type UserRole = 'admin' | 'store_manager' | 'sales_rep';

const PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'store_manager', 'sales_rep'],
  '/dashboard/payments': ['admin', 'store_manager', 'sales_rep'],
  '/dashboard/collections': ['admin', 'store_manager', 'sales_rep'],
  '/dashboard/invoices': ['admin', 'store_manager', 'sales_rep'],
  '/dashboard/customers': ['admin', 'store_manager', 'sales_rep'],
  '/dashboard/products': ['admin', 'store_manager'],
  '/dashboard/locations': ['admin', 'store_manager'],
  '/dashboard/stock-transfer': ['admin', 'store_manager'],
  '/dashboard/users': ['admin'],
  '/dashboard/reports': ['admin', 'store_manager'],
  '/pos': ['admin', 'store_manager', 'sales_rep'],
};

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await getServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !userData) return null;
  return (userData.role as UserRole) || null;
}

export async function checkAccess(pathname: string) {
  const role = await getUserRole();
  if (!role) redirect('/login');

  const matchedPath = Object.keys(PERMISSIONS)
    .filter(p => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];

  if (matchedPath && !PERMISSIONS[matchedPath].includes(role)) {
    redirect('/dashboard?error=no_permission');
  }
}

export async function logoutAction() {
  const supabase = await getServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}