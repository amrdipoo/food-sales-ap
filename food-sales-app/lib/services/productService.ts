// src/lib/services/productService.ts
import { supabase } from '../supabaseClient';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  unit_price: number;
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, barcode, unit_price')
      .eq('barcode', barcode)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null; // منتج غير موجود
    }
    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}