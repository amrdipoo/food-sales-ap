// app/actions/paymentActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

export async function getCustomersWithPendingInvoices() {
  const supabase = await getServerSupabaseClient();
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('customer_id, total_amount, paid_amount, status')
    .in('status', ['pending', 'partial']);

  if (error || !invoices) return [];

  const customerMap: Record<string, { total: number; paid: number; count: number }> = {};
  invoices.forEach(inv => {
    const cid = inv.customer_id;
    if (!cid) return;
    if (!customerMap[cid]) customerMap[cid] = { total: 0, paid: 0, count: 0 };
    customerMap[cid].total += parseNumber(inv.total_amount);
    customerMap[cid].paid += parseNumber(inv.paid_amount);
    customerMap[cid].count += 1;
  });

  const customerIds = Object.keys(customerMap);
  if (!customerIds.length) return [];

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, phone, address')
    .in('id', customerIds)
    .eq('is_active', true)
    .order('name');

  if (!customers) return [];

  return customers.map(c => ({
    ...c,
    invoicesCount: customerMap[c.id].count,
    totalDebt: customerMap[c.id].total - customerMap[c.id].paid,
    totalAmount: customerMap[c.id].total,
    paidAmount: customerMap[c.id].paid,
  }));
}

export async function getCustomerPendingInvoices(customerId: string) {
  if (!customerId) return [];
  const supabase = await getServerSupabaseClient();

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, paid_amount, discount, status, customer_id, sales_rep_id, created_at')
    .eq('customer_id', customerId)
    .in('status', ['pending', 'partial'])
    .order('created_at', { ascending: false });

  if (error || !invoices) return [];

  const repIds = [...new Set(invoices.map(i => i.sales_rep_id).filter(Boolean))];
  const { data: reps } = repIds.length ? await supabase.from('users').select('id, full_name').in('id', repIds) : { data: [] };
  const repsMap = Object.fromEntries((reps || []).map(r => [r.id, r]));

  return invoices.map(inv => ({
    ...inv,
    remaining: Number(inv.total_amount) - Number(inv.paid_amount || 0),
    sales_rep: repsMap[inv.sales_rep_id] || { full_name: 'غير معروف' },
  }));
}

export async function getInvoiceDetails(invoiceId: string) {
  if (!invoiceId) return null;
  const supabase = await getServerSupabaseClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, paid_amount, discount, status, customer_id, sales_rep_id, location_id, created_at, customers(id, name, phone, address), locations(id, name)')
    .eq('id', invoiceId)
    .maybeSingle();

  if (error || !invoice) return null;

  let salesRep = { full_name: 'غير معروف' };
  if (invoice.sales_rep_id) {
    const { data: rep } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', invoice.sales_rep_id)
      .maybeSingle();
    if (rep) salesRep = rep;
  }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('quantity, unit_price, total, products(name)')
    .eq('invoice_id', invoiceId);

  return {
    ...invoice,
    remaining: Number(invoice.total_amount) - Number(invoice.paid_amount || 0),
    sales_rep: salesRep,
    items: items || [],
  };
}

export async function recordPaymentAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (!role) return { success: false, error: 'غير مصرح' };

  const invoice_id = formData.get('invoice_id') as string;
  const customer_id = formData.get('customer_id') as string;
  const amount = parseNumber(formData.get('amount'));
  const payment_method = formData.get('payment_method') as string;
  const collector_id = formData.get('collector_id') as string;
  const notes = formData.get('notes') as string;
  const payment_date = formData.get('payment_date') as string;

  if (!invoice_id || !customer_id || amount <= 0 || !collector_id) {
    return { success: false, error: 'يرجى ملء جميع الحقول المطلوبة' };
  }

  try {
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, paid_amount')
      .eq('id', invoice_id)
      .maybeSingle();

    if (invError || !invoice) throw new Error('الفاتورة غير موجودة');

    const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
    if (amount > remaining) {
      return {
        success: false,
        error: `المبلغ (${amount}) أكبر من المتبقي (${remaining.toFixed(2)})`,
      };
    }

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        customer_id,
        amount,
        payment_method,
        notes,
        user_id: collector_id,
        invoice_id,
        invoice_number: invoice.invoice_number,
        transaction_type: 'collection',
        created_at: payment_date ? new Date(payment_date).toISOString() : new Date().toISOString(),
      });

    if (txError) throw new Error('فشل حفظ السند: ' + txError.message);

    const newPaid = Number(invoice.paid_amount || 0) + amount;
    const newStatus = newPaid >= Number(invoice.total_amount) ? 'paid' : 'partial';

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ paid_amount: newPaid, status: newStatus })
      .eq('id', invoice_id);

    if (updateError) throw new Error('فشل تحديث الفاتورة: ' + updateError.message);

    revalidatePath('/dashboard/payments');
    revalidatePath('/dashboard/invoices');

    return {
      success: true,
      message: 'تم تسجيل الدفعة بنجاح',
      invoice: {
        invoice_number: invoice.invoice_number,
        new_paid_amount: newPaid,
        remaining: remaining - amount,
        status: newStatus,
      },
    };
  } catch (error: any) {
    console.error('خطأ في تسجيل الدفعة:', error);
    return { success: false, error: error.message };
  }
}

export async function getActiveCollectors() {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('is_active', true)
    .in('role', ['admin', 'store_manager', 'sales_rep'])
    .order('full_name');
  return error ? [] : (data || []);
}