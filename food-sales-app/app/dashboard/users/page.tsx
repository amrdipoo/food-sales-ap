// app/dashboard/users/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkAccess } from '../../actions/authActions';
import UsersClientView from './UsersClientView';

export const dynamic = 'force-dynamic';
async function getUsersData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role, is_active, created_at')
    .order('created_at', { ascending: false });

  return error ? [] : (data || []);
}

export default async function UsersPage({ searchParams }: { searchParams?: { success?: string; updated?: string; deleted?: string } }) {
  await checkAccess('/dashboard/users');
  const users = await getUsersData();

  return (
    <UsersClientView 
      users={users} 
      successMessage={searchParams?.success === 'true' ? '✅ تم إضافة المستخدم بنجاح!' : null}
      updatedMessage={searchParams?.updated === 'true' ? '✅ تم تحديث بيانات المستخدم بنجاح!' : null}
      deletedMessage={searchParams?.deleted === 'true' ? '✅ تم حذف المستخدم بنجاح!' : null}
    />
  );
}