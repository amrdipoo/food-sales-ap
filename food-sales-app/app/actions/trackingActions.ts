// app/actions/trackingActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveRepTracking(
  lat: number,
  lng: number,
  accuracy: number,
  actionType: string
) {
  try {
    if (actionType !== 'checkin' && actionType !== 'update') {
      return { success: false, error: 'نوع الإجراء غير صالح' };
    }

    const supabase = await getServerSupabaseClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: 'غير مصرح' };
    }

    const { error } = await supabase
      .from('rep_tracking')
      .insert({
        rep_id: user.id,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy || 0,
        action_type: actionType,
      });

    if (error) {
      console.error('❌ خطأ في إدراج التتبع:', error);
      return { success: false, error: error.message };
    }

    // ✅ تحديث ذاكرة التخزين المؤقت للوحة التحكم
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/tracking-map');

    console.log('✅ تم حفظ التتبع وتحديث الخريطة');
    return { success: true };
  } catch (err: any) {
    console.error('💥 خطأ غير متوقع:', err);
    return { success: false, error: err.message };
  }
}

export async function getRepTrackingData() {
  try {
    const supabase = await getServerSupabaseClient();

    const { error: tableCheck } = await supabase
      .from('rep_tracking')
      .select('id')
      .limit(1);

    if (tableCheck && tableCheck.message?.includes('does not exist')) {
      console.warn('⚠️ جدول rep_tracking غير موجود');
      return [];
    }

    const { data: trackingData, error } = await supabase
      .from('rep_tracking')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    if (!trackingData || trackingData.length === 0) return [];

    const repIds = [...new Set(trackingData.map(t => t.rep_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', repIds);

    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    return trackingData.map(point => ({
      ...point,
      user: usersMap[point.rep_id] || { full_name: 'مندوب', email: 'unknown' },
    }));
  } catch (err: any) {
    console.error('خطأ في جلب التتبع:', err);
    return [];
  }
}