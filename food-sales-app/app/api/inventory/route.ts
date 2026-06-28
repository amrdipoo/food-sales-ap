// app/api/inventory/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { locationId, productIds } = await request.json();
    
    if (!locationId || !productIds || productIds.length === 0) {
      return NextResponse.json({});
    }

    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Cookie: cookieStore.toString(),
          },
        },
      }
    );

    const { data, error } = await supabase
      .from('inventory')
      .select('product_id, quantity')
      .eq('location_id', locationId)
      .in('product_id', productIds);

    if (error) {
      console.error('خطأ في جلب المخزون:', error);
      return NextResponse.json({});
    }

    const stockMap: Record<string, number> = {};
    data?.forEach((item: any) => {
      stockMap[item.product_id] = Number(item.quantity || 0);
    });

    return NextResponse.json(stockMap);
  } catch (error) {
    console.error('خطأ في API:', error);
    return NextResponse.json({});
  }
}