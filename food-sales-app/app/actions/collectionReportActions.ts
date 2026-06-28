// app/actions/collectionReportActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber } from '@/lib/utils';

export interface CollectionReportFilters {
  fromDate?: string;
  toDate?: string;
  collectorId?: string;
  customerId?: string;
  paymentMethod?: string;
}

export async function getCollectionReports(filters: CollectionReportFilters = {}) {
  const supabase = await getServerSupabaseClient();

  let query = supabase
    .from('transactions')
    .select('id, amount, payment_method, notes, customer_id, user_id, invoice_id, created_at')
    .eq('transaction_type', 'collection');

  if (filters.fromDate) query = query.gte('created_at', filters.fromDate);
  if (filters.toDate) query = query.lte('created_at', filters.toDate + ' 23:59:59');
  if (filters.collectorId) query = query.eq('user_id', filters.collectorId);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod);

  const { data: collections, error } = await query.order('created_at', { ascending: false });

  if (error || !collections) {
    console.error('خطأ في جلب التحصيلات:', error);
    return getEmptyReport();
  }

  const customerIds = [...new Set(collections.map(c => c.customer_id).filter(Boolean))];
  const userIds = [...new Set(collections.map(c => c.user_id).filter(Boolean))];

  const [customersRes, usersRes] = await Promise.all([
    customerIds.length ? supabase.from('customers').select('id, name, phone').in('id', customerIds) : { data: [] },
    userIds.length ? supabase.from('users').select('id, full_name, email').in('id', userIds) : { data: [] },
  ]);

  const customersMap = Object.fromEntries((customersRes.data || []).map(c => [c.id, c]));
  const usersMap = Object.fromEntries((usersRes.data || []).map(u => [u.id, u]));

  const collectionsWithDetails = collections.map(c => ({
    ...c,
    customer: customersMap[c.customer_id] || { name: 'عميل نقدي', phone: '' },
    collector: usersMap[c.user_id] || { full_name: 'غير معروف' },
  }));

  const totalAmount = collections.reduce((sum, c) => sum + parseNumber(c.amount), 0);
  const totalCount = collections.length;
  const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

  const cashAmount = collections.filter(c => c.payment_method === 'cash')
    .reduce((sum, c) => sum + parseNumber(c.amount), 0);
  const bankAmount = collections.filter(c => c.payment_method === 'bank_transfer')
    .reduce((sum, c) => sum + parseNumber(c.amount), 0);
  const otherAmount = totalAmount - cashAmount - bankAmount;

  const collectorsStats: Record<string, any> = {};
  collections.forEach(c => {
    const uid = c.user_id || 'unknown';
    if (!collectorsStats[uid]) {
      collectorsStats[uid] = {
        user_id: uid,
        name: usersMap[uid]?.full_name || 'غير معروف',
        totalAmount: 0,
        count: 0,
      };
    }
    collectorsStats[uid].totalAmount += parseNumber(c.amount);
    collectorsStats[uid].count += 1;
  });

  const customersStats: Record<string, any> = {};
  collections.forEach(c => {
    const cid = c.customer_id || 'unknown';
    if (!customersStats[cid]) {
      customersStats[cid] = {
        customer_id: cid,
        name: customersMap[cid]?.name || 'عميل نقدي',
        phone: customersMap[cid]?.phone || '',
        totalAmount: 0,
        count: 0,
      };
    }
    customersStats[cid].totalAmount += parseNumber(c.amount);
    customersStats[cid].count += 1;
  });

  const paymentMethodsStats: Record<string, any> = {};
  collections.forEach(c => {
    const pm = c.payment_method || 'other';
    if (!paymentMethodsStats[pm]) {
      paymentMethodsStats[pm] = {
        method: pm,
        totalAmount: 0,
        count: 0,
      };
    }
    paymentMethodsStats[pm].totalAmount += parseNumber(c.amount);
    paymentMethodsStats[pm].count += 1;
  });

  return {
    collections: collectionsWithDetails,
    summary: {
      totalAmount,
      totalCount,
      avgAmount,
      cashAmount,
      bankAmount,
      otherAmount,
    },
    collectors: Object.values(collectorsStats).sort((a, b) => b.totalAmount - a.totalAmount),
    customers: Object.values(customersStats).sort((a, b) => b.totalAmount - a.totalAmount),
    paymentMethods: Object.values(paymentMethodsStats).sort((a, b) => b.totalAmount - a.totalAmount),
  };
}

function getEmptyReport() {
  return {
    collections: [],
    summary: {
      totalAmount: 0,
      totalCount: 0,
      avgAmount: 0,
      cashAmount: 0,
      bankAmount: 0,
      otherAmount: 0,
    },
    collectors: [],
    customers: [],
    paymentMethods: [],
  };
}

export async function getFilterOptions() {
  const supabase = await getServerSupabaseClient();

  const [usersRes, customersRes] = await Promise.all([
    supabase.from('users').select('id, full_name, role').eq('is_active', true).order('full_name'),
    supabase.from('customers').select('id, name, phone').eq('is_active', true).order('name'),
  ]);

  return {
    collectors: usersRes.data || [],
    customers: customersRes.data || [],
    paymentMethods: [
      { value: 'cash', label: '💵 نقدي' },
      { value: 'bank_transfer', label: '🏦 تحويل بنكي' },
      { value: 'check', label: '📝 شيك' },
      { value: 'credit_card', label: '💳 بطاقة ائتمان' },
    ],
  };
}