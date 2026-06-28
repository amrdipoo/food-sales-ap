// lib/services/productService.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';

// ✅ تصدير الـ interface ليتم استخدامه في ملفات أخرى
export interface Product {
  id: string;
  name: string;
  category: string | null;
  barcode: string;
  unit_type: string;
  cost_price: number;
  unit_price: number;
  is_active: boolean;
}

/**
 * جلب منتج بواسطة الباركود مع التحقق من وجوده وفرادته.
 */
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  if (!barcode) return null;

  const supabase = await getServerSupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, barcode, unit_type, cost_price, unit_price, is_active')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) {
    console.error('❌ خطأ في جلب المنتج:', error.message);
    return null;
  }

  return data as Product;
}

/**
 * جلب منتج بالمعرف (نفس التحسين).
 */
export async function getProductById(productId: string): Promise<Product | null> {
  if (!productId) return null;

  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, barcode, unit_type, cost_price, unit_price, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('❌ خطأ في جلب المنتج بالمعرف:', error.message);
    return null;
  }

  return data as Product;
}