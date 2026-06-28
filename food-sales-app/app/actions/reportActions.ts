// app/actions/reportActions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface ReportFilters {
  invoiceNumber?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function getFinancialReports(filters: ReportFilters = {}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  let query = supabase
    .from('invoices')
    .select(`id, invoice_number, total_amount, paid_amount, discount, status, customer_id, sales_rep_id, created_at`);

  if (filters.invoiceNumber) query = query.ilike('invoice_number', `%${filters.invoiceNumber}%`);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate + ' 23:59:59');

  const { data: invoices, error: invError } = await query.order('created_at', { ascending: false });
  if (invError) console.error('خطأ الفواتير:', invError);

  const customerIds = [...new Set((invoices || []).map(inv => inv.customer_id).filter(Boolean))];
  const repIds = [...new Set((invoices || []).map(inv => inv.sales_rep_id).filter(Boolean))];
  const invoiceIds = (invoices || []).map(inv => inv.id);

  let customersMap: Record<string, any> = {};
  let repsMap: Record<string, any> = {};
  let itemsByInvoice: Record<string, any[]> = {};

  if (customerIds.length > 0) {
    const { data } = await supabase.from('customers').select('id, name, phone').in('id', customerIds);
    data?.forEach(c => { customersMap[c.id] = c; });
  }

  if (repIds.length > 0) {
    const { data } = await supabase.from('users').select('id, full_name').in('id', repIds);
    data?.forEach(u => { repsMap[u.id] = u; });
  }

  if (invoiceIds.length > 0) {
    const { data } = await supabase.from('invoice_items').select('invoice_id, quantity, unit_price, total, product_id, products(name)').in('invoice_id', invoiceIds);
    data?.forEach(item => {
      if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
      itemsByInvoice[item.invoice_id].push(item);
    });
  }

  const invoicesWithDetails = (invoices || []).map(inv => ({
    ...inv,
    customers: customersMap[inv.customer_id] || null,
    sales_rep: repsMap[inv.sales_rep_id] || { full_name: 'غير معروف' },
    items: itemsByInvoice[inv.id] || []
  }));

  let collectionsQuery = supabase
    .from('transactions')
    .select(`id, amount, payment_method, notes, customer_id, user_id, created_at`)
    .eq('transaction_type', 'collection');

  if (filters.customerId) collectionsQuery = collectionsQuery.eq('customer_id', filters.customerId);
  if (filters.fromDate) collectionsQuery = collectionsQuery.gte('created_at', filters.fromDate);
  if (filters.toDate) collectionsQuery = collectionsQuery.lte('created_at', filters.toDate + ' 23:59:59');

  const { data: collections, error: collError } = await collectionsQuery.order('created_at', { ascending: false });
  if (collError) console.error('خطأ التحصيلات:', collError);

  const collectorIds = [...new Set((collections || []).map(c => c.user_id).filter(Boolean))];
  let collectorsMap: Record<string, any> = {};
  if (collectorIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, full_name').in('id', collectorIds);
    users?.forEach(u => { collectorsMap[u.id] = u; });
  }

  const collectionsWithDetails = (collections || []).map(c => ({
    ...c,
    customers: customersMap[c.customer_id] || { name: 'عميل نقدي' },
    collector: collectorsMap[c.user_id] || { full_name: 'غير معروف' }
  }));

  const totalSales = invoicesWithDetails.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = invoicesWithDetails.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalDiscount = invoicesWithDetails.reduce((sum, inv) => sum + Number(inv.discount || 0), 0);
  const totalCollected = collectionsWithDetails.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const cashInvoices = invoicesWithDetails.filter(inv => inv.status === 'paid');
  const totalCashInvoices = cashInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const cashInvoicesCount = cashInvoices.length;

  const creditInvoices = invoicesWithDetails.filter(inv => inv.status === 'pending' || inv.status === 'partial');
  const totalCreditInvoices = creditInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const creditInvoicesCount = creditInvoices.length;

  return {
    invoices: invoicesWithDetails,
    collections: collectionsWithDetails,
    summary: {
      totalSales,
      totalPaid,
      totalDiscount,
      totalCollected,
      remainingDebt: totalSales - totalPaid,
      invoiceCount: invoicesWithDetails.length,
      collectionCount: collectionsWithDetails.length,
      totalCashInvoices,
      cashInvoicesCount,
      totalCreditInvoices,
      creditInvoicesCount,
    }
  };
}