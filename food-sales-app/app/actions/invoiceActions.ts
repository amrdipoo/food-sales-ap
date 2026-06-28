// app/actions/invoiceActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { parseNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

/**
 * توليد رقم فاتورة احترافي: [كود_المندوب]-[YYYYMMDD]-[رقم_متسلسل]
 */
export async function generateInvoiceNumber(): Promise<string> {
  const supabase = await getServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولاً');

  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  let repCode = 'USR';
  if (userData?.full_name) {
    const parts = userData.full_name.split(' ');
    repCode = (parts[0].substring(0, 3) + (parts[1]?.[0] || '')).toUpperCase();
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${repCode}-${dateStr}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let serial = 1;
  if (lastInvoice?.invoice_number) {
    const parts = lastInvoice.invoice_number.split('-');
    const lastSerial = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSerial)) serial = lastSerial + 1;
  }

  return `${repCode}-${dateStr}-${String(serial).padStart(4, '0')}`;
}

/**
 * جلب كمية المخزون لمنتج في موقع معين
 */
export async function getProductStockAction(productId: string, locationId: string): Promise<number> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .maybeSingle();
  if (error) return 0;
  return Number(data?.quantity || 0);
}

/**
 * حفظ فاتورة جديدة مع خصم المخزون (معاملة متكاملة)
 */
export async function submitInvoiceAction(invoiceData: any) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (!role) return { success: false, error: 'غير مصرح' };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    if (!currentUserId) return { success: false, error: 'يجب تسجيل الدخول' };

    const totalAmount = parseNumber(invoiceData.total_amount);
    const paidAmount = parseNumber(invoiceData.paid_amount);
    const discount = parseNumber(invoiceData.discount);
    const status = paidAmount >= totalAmount ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

    // 1️⃣ التحقق من المخزون بشكل صارم
    if (invoiceData.location_id && invoiceData.items?.length > 0) {
      const productIds = invoiceData.items.map((i: any) => i.product_id);
      const { data: inventoryData, error: invError } = await supabase
        .from('inventory')
        .select('product_id, quantity')
        .eq('location_id', invoiceData.location_id)
        .in('product_id', productIds);

      if (invError) {
        return { success: false, error: 'خطأ في التحقق من المخزون: ' + invError.message };
      }

      const availableQty: Record<string, number> = {};
      inventoryData?.forEach((inv: any) => {
        availableQty[inv.product_id] = Number(inv.quantity || 0);
      });

      for (const item of invoiceData.items) {
        const available = availableQty[item.product_id] || 0;
        const requested = Number(item.quantity);
        if (requested > available) {
          return {
            success: false,
            error: `المنتج "${item.name || 'غير معروف'}" غير متوفر بالكمية المطلوبة (المتاح: ${available})`,
          };
        }
      }
    }

    // 2️⃣ إنشاء الفاتورة
    const invoiceNumber = await generateInvoiceNumber();
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: invoiceData.customer_id || null,
        location_id: invoiceData.location_id || null,
        sales_rep_id: currentUserId,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        discount,
        status,
        type: invoiceData.type || 'sale',
      })
      .select()
      .single();

    if (invoiceError) throw new Error(invoiceError.message);

    // 3️⃣ إضافة البنود وخصم المخزون
    if (invoiceData.items?.length > 0) {
      const itemsWithInvoiceId = invoiceData.items.map((item: any) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithInvoiceId);

      if (itemsError) throw new Error('فشل إضافة البنود: ' + itemsError.message);

      // 4️⃣ خصم المخزون
      if (invoiceData.location_id) {
        for (const item of invoiceData.items) {
          const { data: currentInventory } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('product_id', item.product_id)
            .eq('location_id', invoiceData.location_id)
            .maybeSingle();

          if (currentInventory) {
            const newQty = Number(currentInventory.quantity) - Number(item.quantity);
            if (newQty < 0) {
              throw new Error(`المنتج "${item.name}" أصبح رصيده سالباً بعد الخصم.`);
            }
            const { error: updateError } = await supabase
              .from('inventory')
              .update({ quantity: newQty })
              .eq('product_id', item.product_id)
              .eq('location_id', invoiceData.location_id);

            if (updateError) throw new Error('فشل تحديث المخزون: ' + updateError.message);
          } else {
            throw new Error(`المنتج "${item.name}" غير موجود في المخزون للموقع المحدد.`);
          }
        }
      }
    }

    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/products');
    revalidatePath('/pos');

    return {
      success: true,
      message: 'تم حفظ الفاتورة بنجاح',
      invoiceId: invoice.id,
      invoiceNumber,
      remaining: totalAmount - paidAmount,
    };

  } catch (error: any) {
    console.error('💥 خطأ:', error);
    return { success: false, error: error.message };
  }
}

/**
 * حذف ناعم للفاتورة (تحويل الحالة إلى 'deleted')
 */
export async function softDeleteInvoiceAction(invoiceId: string) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('paid_amount, status')
    .eq('id', invoiceId)
    .maybeSingle();

  if (!invoice) return { success: false, error: 'الفاتورة غير موجودة' };

  if (Number(invoice.paid_amount) > 0) {
    return {
      success: false,
      error: '⛔ لا يمكن حذف هذه الفاتورة لوجود تحصيلات مالية مرتبطة بها.',
    };
  }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('id')
    .eq('invoice_id', invoiceId)
    .limit(1)
    .maybeSingle();

  if (items) {
    return {
      success: false,
      error: '⛔ لا يمكن حذف هذه الفاتورة لأنها أثرت على المخزون.',
    };
  }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'deleted' })
    .eq('id', invoiceId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/invoices');
  return { success: true };
}

/**
 * استعادة فاتورة محذوفة
 */
export async function restoreInvoiceAction(invoiceId: string) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'pending' })
    .eq('id', invoiceId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/invoices');
  return { success: true };
}

/**
 * تحديث بيانات الفاتورة
 */
export async function updateInvoiceAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin' && role !== 'store_manager') {
    return { success: false, error: 'غير مصرح' };
  }

  const id = formData.get('id') as string;
  const total_amount = parseNumber(formData.get('total_amount'));
  const paid_amount = parseNumber(formData.get('paid_amount'));
  const status = formData.get('status') as string;

  const { error } = await supabase
    .from('invoices')
    .update({ total_amount, paid_amount, status })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/invoices');
  return { success: true };
}

/**
 * جلب قائمة الفواتير مع تفاصيل العملاء والمندوبين
 */
export async function getInvoicesList() {
  const supabase = await getServerSupabaseClient();

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total_amount,
      paid_amount,
      discount,
      status,
      customer_id,
      sales_rep_id,
      created_at,
      customers (id, name, phone),
      users!invoices_sales_rep_id_fkey (id, full_name)
    `)
    .order('created_at', { ascending: false });

  if (error || !invoices) {
    console.error('❌ خطأ في جلب الفواتير:', error);
    return [];
  }

  return invoices.map((inv: any) => ({
    ...inv,
    customer: inv.customers || { name: 'عميل نقدي' },
    sales_rep: inv.users || { full_name: 'غير معروف' },
    remaining: Number(inv.total_amount || 0) - Number(inv.paid_amount || 0),
  }));
}