// app/dashboard/locations/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addLocationAction, toggleLocationStatusAction } from '../../actions/locationActions';

async function getLocationsAndReps() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // جلب المواقع مع اسم المندوب المسؤول (إن وجد)
  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select(`
      *,
      users (full_name)
    `)
    .order('created_at', { ascending: false });

  // جلب قائمة المندوبين للقائمة المنسدلة
  const { data: reps, error: repError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('role', 'sales_rep');

  if (locError) console.error("خطأ في جلب المواقع:", locError);
  if (repError) console.error("خطأ في جلب المندوبين:", repError);

  return { locations: locations || [], reps: reps || [] };
}

export default async function LocationsPage() {
  const { locations, reps } = await getLocationsAndReps();

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">إدارة المخازن والسيارات</h1>
      </div>

      {/* نموذج إضافة موقع جديد */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-2xl">🏢</span> إضافة موقع جديد
        </h2>
        <form action={addLocationAction} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            name="name"
            required
            placeholder="اسم الموقع (مثال: سيارة رقم 1)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          
          <select
            name="type"
            required
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="store">🏪 مخزن / محل رئيسي</option>
            <option value="vehicle">🚚 سيارة توزيع</option>
          </select>

          <select
            name="assigned_rep_id"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
          >
            <option value="">-- بدون مندوب مسؤول --</option>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.full_name}</option>
            ))}
          </select>

          <button
            type="submit"
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>حفظ الموقع</span>
          </button>
        </form>
      </div>

      {/* جدول المواقع */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">اسم الموقع</th>
                <th className="p-4">النوع</th>
                <th className="p-4">المندوب المسؤول</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    لا توجد مواقع مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{loc.name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        loc.type === 'vehicle' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {loc.type === 'vehicle' ? '🚚 سيارة توزيع' : '🏪 مخزن'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {loc.users?.full_name || <span className="text-gray-400">غير محدد</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        loc.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {loc.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-4">
                      <form action={toggleLocationStatusAction.bind(null, loc.id, loc.is_active)}>
                        <button
                          type="submit"
                          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                            loc.is_active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {loc.is_active ? 'تعطيل' : 'تفعيل'}
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