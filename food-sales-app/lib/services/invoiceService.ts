// lib/services/invoiceService.ts
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export interface InvoiceItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceParams {
  type: 'store_sale' | 'vehicle_sale';
  locationId: string;
  customerId?: string;
  salesRepId: string;
  items: InvoiceItemInput[];
  paymentType: 'cash' | 'credit';
}

export interface InvoiceResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

export async function createInvoice(data: CreateInvoiceParams): Promise<InvoiceResult> {
  try {
    // 1. حساب الإجمالي
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    
    // إذا كان الدفع نقدياً، فالمبلغ المحصل يساوي الإجمالي. إذا كان آجلاً، فالمحصل صفر.
    const paidAmount = data.paymentType === 'cash' ? totalAmount : 0;
    const invoiceNumber = `INV-${Date.now()}`;

    // 2. إنشاء رأس الفاتورة
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        id: uuidv4(),
        invoice_number: invoiceNumber,
        type: data.type,
        location_id: data.locationId,
        customer_id: data.customerId || null,
        sales_rep_id: data.salesRepId,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        payment_type: data.paymentType,
      })
      .select('id')
      .single();

    if (invoiceError || !invoice) {
      throw new Error(invoiceError?.message || 'فشل في إنشاء رأس الفاتورة');
    }

    // 3. إنشاء أصناف الفاتورة (Trigger سيقوم بخصم المخزون تلقائياً)
    const itemsToInsert = data.items.map(item => ({
      id: uuidv4(),
      invoice_id: invoice.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    // 🆕 4. التحديث المحاسبي: إذا كان هناك دين وعميل محدد، نحدث رصيده
    const debt = totalAmount - paidAmount;
    
    if (debt > 0 && data.customerId) {
      // أ) جلب الرصيد الحالي للعميل
      const { data: customerData, error: fetchError } = await supabase
        .from('customers')
        .select('current_balance')
        .eq('id', data.customerId)
        .single();

      if (!fetchError && customerData) {
        // ب) حساب الرصيد الجديد (الرصيد الحالي + الدين الجديد)
        const currentBalance = Number(customerData.current_balance || 0);
        const newBalance = currentBalance + debt;

        // ج) تحديث الرصيد في قاعدة البيانات
        const { error: updateError } = await supabase
          .from('customers')
          .update({ current_balance: newBalance })
          .eq('id', data.customerId);

        if (updateError) {
          console.error('فشل في تحديث رصيد العميل:', updateError);
          // ملاحظة: لا نرمي خطأ هنا حتى لا نفشل الفاتورة التي تم حفظها بنجاح، 
          // لكن نسجل الخطأ للمراجعة.
        }
      }
    }

    return { success: true, invoiceId: invoice.id };
  } catch (error: any) {
    console.error('Invoice Creation Error:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع' };
  }
}