// app/dashboard/users/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addUserAction, toggleUserStatusAction } from '../../actions/userActions';

async function getUsers() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ خطأ في جلب المستخدمين:", error);
    return [];
  }

  return data || [];
}

export default async function UsersPage() {
  const users = await getUsers();

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return '👑 مدير نظام';
      case 'store_manager': return '🏪 مدير مخزن';
      case 'sales_rep': return '🚚 مندوب مبيعات';
      default: return role;
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">إدارة المستخدمين والمندوبين</h1>
      </div>

      {/* نموذج إضافة مستخدم جديد */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-2xl">👤</span> إضافة مستخدم / مندوب جديد
        </h2>
        <form action={addUserAction} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            name="full_name"
            required
            placeholder="الاسم الكامل"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="البريد الإلكتروني (للدخول)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            name="phone"
            placeholder="رقم الهاتف"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            name="role"
            required
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="sales_rep">🚚 مندوب مبيعات</option>
            <option value="store_manager">🏪 مدير مخزن</option>
            <option value="admin">👑 مدير نظام</option>
          </select>
          <button
            type="submit"
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>حفظ المستخدم</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">* كلمة المرور الافتراضية للمستخدم الجديد هي: <strong>12345678</strong></p>
      </div>

      {/* جدول المستخدمين */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">الاسم الكامل</th>
                <th className="p-4">البريد الإلكتروني</th>
                <th className="p-4">رقم الهاتف</th>
                <th className="p-4">الدور / الصلاحية</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    لا يوجد مستخدمين مسجلين حتى الآن.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{user.full_name}</td>
                    <td className="p-4 text-gray-600" dir="ltr">{user.email || '-'}</td>
                    <td className="p-4 text-gray-600" dir="ltr">{user.phone || '-'}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-4">
                      <form action={toggleUserStatusAction.bind(null, user.id, user.is_active)}>
                        <button
                          type="submit"
                          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                            user.is_active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}