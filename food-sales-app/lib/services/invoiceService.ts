// lib/services/invoiceService.ts
import { supabase } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface InvoiceItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceInput {
  customer_id: string | null;
  location_id: string;
  type: 'store_sale' | 'vehicle_sale';
  items: InvoiceItemInput[];
  total_amount: number;
  paid_amount: number;
  discount: number;
}

export interface InvoiceOutput {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  location_id: string;
  sales_rep_id: string;
  total_amount: number;
  paid_amount: number;
  discount: number;
  status: 'pending' | 'partial' | 'paid' | 'deleted';
  type: 'store_sale' | 'vehicle_sale';
  created_at: string;
}

export async function createInvoice(invoiceData: InvoiceInput, userId: string): Promise<InvoiceOutput> {
  const invoiceNumber = await generateInvoiceNumber(userId);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      customer_id: invoiceData.customer_id,
      location_id: invoiceData.location_id,
      sales_rep_id: userId,
      total_amount: invoiceData.total_amount,
      paid_amount: invoiceData.paid_amount,
      discount: invoiceData.discount,
      status: invoiceData.paid_amount >= invoiceData.total_amount ? 'paid' : 'pending',
      type: invoiceData.type,
    })
    .select()
    .single();

  if (error) throw new Error(`فشل إنشاء الفاتورة: ${error.message}`);
  return data;
}

export async function addInvoiceItems(invoiceId: string, items: InvoiceItemInput[]) {
  const itemsWithInvoice = items.map((item) => ({
    invoice_id: invoiceId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.quantity * item.unit_price,
  }));

  const { error } = await supabase.from('invoice_items').insert(itemsWithInvoice);

  if (error) throw new Error(`فشل إضافة بنود الفاتورة: ${error.message}`);
}

export async function updateInventory(locationId: string, items: InvoiceItemInput[]) {
  for (const item of items) {
    const { data: currentInventory } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', item.product_id)
      .eq('location_id', locationId)
      .single();

    if (currentInventory) {
      const newQuantity = currentInventory.quantity - item.quantity;
      if (newQuantity < 0) {
        throw new Error(`المنتج غير متوفر بالكمية المطلوبة`);
      }

      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('product_id', item.product_id)
        .eq('location_id', locationId);

      if (error) throw new Error(`فشل تحديث المخزون: ${error.message}`);
    } else {
      throw new Error(`المنتج غير موجود في المخزون`);
    }
  }
}

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

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