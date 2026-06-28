// app/dashboard/reports/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ReportsClientView from './ReportsClientView';
import { checkAccess } from '../../actions/authActions';
export const dynamic = 'force-dynamic';

async function getInitialData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('is_active', true)
    .order('name');

  return {
    customers: customers || []
  };
}

export default async function ReportsPage(props: { 
  searchParams: Promise<{ 
    invoiceNumber?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}) {
  await checkAccess('/dashboard/reports');
  const searchParams = await props.searchParams;
  const { customers } = await getInitialData();

  return (
    <ReportsClientView 
      customers={customers}
      initialFilters={searchParams || {}}
    />
  );
}