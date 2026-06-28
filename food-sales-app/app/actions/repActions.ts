// app/actions/reportActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber } from '@/lib/utils';

interface ReportFilters {
  invoiceNumber?: string;
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function getFinancialReports(filters: ReportFilters = {}) {
  const supabase = await getServerSupabaseClient();

  let query = supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, paid_amount, discount, status, customer_id, sales_rep_id, created_at');

  if (filters.invoiceNumber) query = query.ilike('invoice_number', `%${filters.invoiceNumber}%`);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate + ' 23:59:59');

  const { data: invoices, error: invError } = await query.order('created_at', { ascending: false });
  if (invError) console.error('خطأ الفواتير:', invError);

  const invoiceIds = invoices?.map(inv => inv.id) || [];
  const customerIds = [...new Set(invoices?.map(inv => inv.customer_id).filter(Boolean) || [])];
  const repIds = [...new Set(invoices?.map(inv => inv.sales_rep_id).filter(Boolean) || [])];

  const [customersRes, repsRes, itemsRes] = await Promise.all([
    customerIds.length ? supabase.from('customers').select('id, name, phone').in('id', customerIds) : { data: [] },
    repIds.length ? supabase.from('users').select('id, full_name').in('id', repIds) : { data: [] },
    invoiceIds.length ? supabase.from('invoice_items').select('invoice_id, quantity, unit_price, total, product_id, products(name)').in('invoice_id', invoiceIds) : { data: [] },
  ]);

  const customersMap = Object.fromEntries((customersRes.data || []).map(c => [c.id, c]));
  const repsMap = Object.fromEntries((repsRes.data || []).map(u => [u.id, u]));
  const itemsByInvoice: Record<string, any[]> = {};
  (itemsRes.data || []).forEach(item => {
    if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
    itemsByInvoice[item.invoice_id].push(item);
  });

  const invoicesWithDetails = (invoices || []).map(inv => ({
    ...inv,
    customer: customersMap[inv.customer_id] || null,
    sales_rep: repsMap[inv.sales_rep_id] || { full_name: 'غير معروف' },
    items: itemsByInvoice[inv.id] || [],
  }));

  let collectionsQuery = supabase
    .from('transactions')
    .select('id, amount, payment_method, notes, customer_id, user_id, created_at')
    .eq('transaction_type', 'collection');

  if (filters.customerId) collectionsQuery = collectionsQuery.eq('customer_id', filters.customerId);
  if (filters.fromDate) collectionsQuery = collectionsQuery.gte('created_at', filters.fromDate);
  if (filters.toDate) collectionsQuery = collectionsQuery.lte('created_at', filters.toDate + ' 23:59:59');

  const { data: collections, error: collError } = await collectionsQuery.order('created_at', { ascending: false });
  if (collError) console.error('خطأ التحصيلات:', collError);

  const collectorIds = [...new Set(collections?.map(c => c.user_id).filter(Boolean) || [])];
  const collectorsRes = collectorIds.length ? await supabase.from('users').select('id, full_name').in('id', collectorIds) : { data: [] };
  const collectorsMap = Object.fromEntries((collectorsRes.data || []).map(u => [u.id, u]));

  const collectionsWithDetails = (collections || []).map(c => ({
    ...c,
    customer: customersMap[c.customer_id] || { name: 'عميل نقدي' },
    collector: collectorsMap[c.user_id] || { full_name: 'غير معروف' },
  }));

  const totalSales = invoicesWithDetails.reduce((sum, inv) => sum + parseNumber(inv.total_amount), 0);
  const totalPaid = invoicesWithDetails.reduce((sum, inv) => sum + parseNumber(inv.paid_amount), 0);
  const totalDiscount = invoicesWithDetails.reduce((sum, inv) => sum + parseNumber(inv.discount), 0);
  const totalCollected = collectionsWithDetails.reduce((sum, c) => sum + parseNumber(c.amount), 0);

  const paidInvoices = invoicesWithDetails.filter(inv => inv.status === 'paid');
  const creditInvoices = invoicesWithDetails.filter(inv => inv.status === 'pending' || inv.status === 'partial');

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
      totalCashInvoices: paidInvoices.reduce((s, i) => s + parseNumber(i.total_amount), 0),
      cashInvoicesCount: paidInvoices.length,
      totalCreditInvoices: creditInvoices.reduce((s, i) => s + parseNumber(i.total_amount), 0),
      creditInvoicesCount: creditInvoices.length,
    },
  };
}