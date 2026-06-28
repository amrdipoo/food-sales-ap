// app/actions/userActions.ts
'use server';

import { getServerSupabaseClient } from '@/lib/supabase';
import { validateRequired } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { getUserRole } from './authActions';

/**
 * تسجيل مستخدم جديد (يسمح فقط للمدير).
 * تُستخدم هذه الدالة كمضيف لـ addUserAction.
 */
export async function registerUserAction(formData: FormData) {
  console.log('🚀 بدء عملية تسجيل مستخدم جديد');

  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  
  if (role !== 'admin') {
    return { success: false, error: 'غير مصرح، فقط المدير يمكنه إضافة مستخدمين' };
  }

  const fullName = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const newRole = (formData.get('role') as string) || 'sales_rep';
  const phone = formData.get('phone') as string || null;

  const missing = validateRequired(fullName, 'الاسم الكامل') ||
                  validateRequired(email, 'البريد الإلكتروني') ||
                  (password.length < 6 ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : null);
  if (missing) return { success: false, error: missing };

  try {
    let supabaseAdmin;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
    } else {
      supabaseAdmin = supabase;
    }

    let authResult;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      authResult = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
    } else {
      authResult = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
    }

    if (authResult.error) {
      return { success: false, error: 'فشل إنشاء الحساب: ' + authResult.error.message };
    }

    if (!authResult.data.user) {
      return { success: false, error: 'فشل إنشاء المستخدم (لا توجد بيانات)' };
    }

    const userId = authResult.data.user.id;

    // إضافة سجل في جدول users
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        phone: phone,
        role: newRole,
        is_active: true,
      });

    if (insertError) {
      // محاولة إدراج عبر admin لتجاوز RLS
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { error: insertAdminError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email,
            full_name: fullName,
            phone: phone,
            role: newRole,
            is_active: true,
          });
        if (insertAdminError) {
          return { success: false, error: 'فشل إضافة المستخدم للنظام: ' + insertAdminError.message };
        }
      } else {
        return { success: false, error: 'فشل إضافة المستخدم للنظام: ' + insertError.message };
      }
    }

    revalidatePath('/dashboard/users');
    return { success: true, message: 'تم التسجيل بنجاح' };
  } catch (error: any) {
    console.error('💥 خطأ في التسجيل:', error);
    return { success: false, error: error.message || 'حدث خطأ غير متوقع' };
  }
}

// ✅ دوال مُصدَّرة للاستخدام في الواجهة

/**
 * إضافة مستخدم جديد (تستخدم registerUserAction).
 */
export async function addUserAction(formData: FormData) {
  return await registerUserAction(formData);
}

/**
 * تحديث بيانات مستخدم (للمدير فقط).
 */
export async function updateUserAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin') {
    return { success: false, error: 'غير مصرح' };
  }

  const id = formData.get('id') as string;
  const full_name = formData.get('full_name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string || null;
  const newRole = formData.get('role') as string;
  const newPassword = formData.get('new_password') as string;

  if (!id || !full_name || !email || !newRole) {
    return { success: false, error: 'بيانات غير مكتملة' };
  }

  // تحديث جدول users
  const updateData: any = { full_name, email, phone, role: newRole };
  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('❌ خطأ في تحديث المستخدم:', error);
    return { success: false, error: error.message };
  }

  // تحديث كلمة المرور إذا تم إدخالها
  if (newPassword && newPassword.length >= 6) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { error: passError } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
      if (passError) {
        console.warn('⚠️ فشل تحديث كلمة المرور:', passError);
      }
    }
  }

  revalidatePath('/dashboard/users');
  return { success: true, message: 'تم تحديث المستخدم بنجاح' };
}

/**
 * حذف مستخدم (للمدير فقط).
 */
export async function deleteUserAction(formData: FormData) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin') {
    return { success: false, error: 'غير مصرح' };
  }

  const userId = formData.get('userId') as string;
  if (!userId) return { success: false, error: 'معرف المستخدم مطلوب' };

  // 1. حذف من جدول users
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('❌ خطأ في حذف المستخدم من users:', error);
    return { success: false, error: error.message };
  }

  // 2. حذف من auth.users باستخدام admin
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('⚠️ فشل حذف المستخدم من auth:', authError);
    }
  }

  revalidatePath('/dashboard/users');
  return { success: true, message: 'تم حذف المستخدم بنجاح' };
}

/**
 * تبديل حالة المستخدم (تفعيل/تعطيل) للمدير فقط.
 */
export async function toggleUserStatusAction(userId: string, currentStatus: boolean) {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin') {
    return { success: false, error: 'غير مصرح' };
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: !currentStatus })
    .eq('id', userId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/users');
  return { success: true };
}

/**
 * جلب بيانات المستخدم الحالي.
 */
export async function getCurrentUserAction() {
  try {
    const supabase = await getServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !userData) return null;
    return userData;
  } catch (err: any) {
    console.error('خطأ في جلب المستخدم الحالي:', err);
    return null;
  }
}

/**
 * جلب جميع المستخدمين (للمدير).
 */
export async function getAllUsersAction() {
  const supabase = await getServerSupabaseClient();
  const role = await getUserRole();
  if (role !== 'admin') {
    return { success: false, error: 'غير مصرح', data: [] };
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, phone, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('خطأ في جلب المستخدمين:', error);
    return { success: false, error: error.message, data: [] };
  }

  return { success: true, data: data || [] };
}

// ✅ تم إزالة السطر الخاطئ: export default UsersClientView;