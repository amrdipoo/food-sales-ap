// app/actions/collectionActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber, validateRequired } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

export async function createCollectionAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (!role) return { success: false, error: 'غير مصرح' };

  const customer_id = formData.get('customer_id') as string;
  const amount = parseNumber(formData.get('amount'));
  const payment_method = formData.get('payment_method') as string;
  const notes = formData.get('notes') as string;
  const user_id = formData.get('user_id') as string;
  const invoice_id = (formData.get('invoice_id') as string) || null;

  const missing = validateRequired(customer_id, 'العميل') ||
                  validateRequired(amount, 'المبلغ') ||
                  (amount <= 0 ? 'المبلغ يجب أن يكون أكبر من صفر' : null) ||
                  validateRequired(user_id, 'المحصل');
  if (missing) return { success: false, error: missing };

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customer_id)
    .maybeSingle();
  if (!customer) return { success: false, error: 'العميل غير موجود' };

  if (invoice_id) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount')
      .eq('id', invoice_id)
      .maybeSingle();

    if (invoice) {
      const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
      if (amount > remaining) {
        return {
          success: false,
          error: `المبلغ (${amount}) أكبر من المتبقي (${remaining.toFixed(2)})`,
        };
      }
    }
  }

  const { error } = await supabase
    .from('transactions')
    .insert({
      customer_id,
      amount,
      payment_method,
      notes,
      user_id,
      invoice_id,
      transaction_type: 'collection',
    });

  if (error) {
    console.error('❌ خطأ في حفظ السند:', error);
    return { success: false, error: error.message };
  }

  if (invoice_id) {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount')
      .eq('id', invoice_id)
      .maybeSingle();

    if (invoice) {
      const newPaid = Number(invoice.paid_amount || 0) + amount;
      const newStatus = newPaid >= Number(invoice.total_amount) ? 'paid' : 'partial';
      await supabase
        .from('invoices')
        .update({ paid_amount: newPaid, status: newStatus })
        .eq('id', invoice_id);
    }
  }

  revalidatePath('/dashboard/collections');
  revalidatePath('/dashboard/invoices');
  return { success: true, message: '✅ تم حفظ سند القبض بنجاح' };
}

export async function getActiveUsers() {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('is_active', true)
    .order('full_name');
  return error ? [] : (data || []);
}

export async function getActiveCustomers() {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone')
    .eq('is_active', true)
    .order('name');
  return error ? [] : (data || []);
}

export async function getCollectionsList() {
  const supabase = await getServerSupabaseClient();
  const { data: collections, error } = await supabase
    .from('transactions')
    .select('id, amount, payment_method, notes, customer_id, user_id, invoice_id, created_at')
    .eq('transaction_type', 'collection')
    .order('created_at', { ascending: false });

  if (error || !collections) return [];

  const customerIds = [...new Set(collections.map(c => c.customer_id).filter(Boolean))];
  const userIds = [...new Set(collections.map(c => c.user_id).filter(Boolean))];
  const invoiceIds = [...new Set(collections.map(c => c.invoice_id).filter(Boolean))];

  const [customers, users, invoices] = await Promise.all([
    customerIds.length ? supabase.from('customers').select('id, name, phone').in('id', customerIds) : { data: [] },
    userIds.length ? supabase.from('users').select('id, full_name').in('id', userIds) : { data: [] },
    invoiceIds.length ? supabase.from('invoices').select('id, invoice_number').in('id', invoiceIds) : { data: [] },
  ]);

  const customersMap = Object.fromEntries((customers.data || []).map(c => [c.id, c]));
  const usersMap = Object.fromEntries((users.data || []).map(u => [u.id, u]));
  const invoicesMap = Object.fromEntries((invoices.data || []).map(inv => [inv.id, inv]));

  return collections.map(c => ({
    ...c,
    customer: customersMap[c.customer_id] || { name: 'عميل نقدي' },
    collector: usersMap[c.user_id] || { full_name: 'غير معروف' },
    invoice: c.invoice_id ? (invoicesMap[c.invoice_id] || null) : null,
  }));
}

export async function deleteCollectionAction(collectionId: string) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح بحذف سندات القبض' };
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', collectionId);

  if (error) {
    console.error('❌ خطأ في الحذف:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/collections');
  return { success: true };
}

export async function getPendingInvoices() {
  const supabase = await getServerSupabaseClient();
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, paid_amount, discount, status, customer_id, sales_rep_id, created_at')
    .in('status', ['pending', 'partial'])
    .order('created_at', { ascending: false });

  if (error || !invoices) return [];

  const customerIds = [...new Set(invoices.map(inv => inv.customer_id).filter(Boolean))];
  const repIds = [...new Set(invoices.map(inv => inv.sales_rep_id).filter(Boolean))];

  const [customers, reps] = await Promise.all([
    customerIds.length ? supabase.from('customers').select('id, name, phone').in('id', customerIds) : { data: [] },
    repIds.length ? supabase.from('users').select('id, full_name').in('id', repIds) : { data: [] },
  ]);

  const customersMap = Object.fromEntries((customers.data || []).map(c => [c.id, c]));
  const repsMap = Object.fromEntries((reps.data || []).map(u => [u.id, u]));

  return invoices.map(inv => ({
    ...inv,
    customer: customersMap[inv.customer_id] || { name: 'عميل نقدي' },
    sales_rep: repsMap[inv.sales_rep_id] || { full_name: 'غير معروف' },
    remaining: Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)),
  }));
}