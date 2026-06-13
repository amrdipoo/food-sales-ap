// app/dashboard/customers/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addCustomerAction, toggleCustomerStatusAction } from '../../actions/customerActions';

async function getCustomers() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ خطأ في جلب العملاء:", error);
    return [];
  }

  return data || [];
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">إدارة العملاء</h1>
      </div>

      {/* نموذج إضافة عميل جديد */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-2xl">➕</span> إضافة عميل جديد
        </h2>
        <form action={addCustomerAction} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            name="name"
            required
            placeholder="اسم العميل / المحل"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            name="phone"
            placeholder="رقم الهاتف"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <input
            name="address"
            placeholder="العنوان"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none md:col-span-1"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <span>حفظ العميل</span>
          </button>
        </form>
      </div>

      {/* جدول العملاء */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">اسم العميل</th>
                <th className="p-4">رقم الهاتف</th>
                <th className="p-4">العنوان</th>
                <th className="p-4">الرصيد الحالي</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    لا يوجد عملاء مسجلين حتى الآن.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{customer.name}</td>
                    <td className="p-4 text-gray-600" dir="ltr">{customer.phone || '-'}</td>
                    <td className="p-4 text-gray-600">{customer.address || '-'}</td>
                    <td className="p-4">
                      <span className={`font-bold ${customer.current_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Number(customer.current_balance || 0).toFixed(2)} ر.س
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        customer.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {customer.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-4">
                      <form action={toggleCustomerStatusAction.bind(null, customer.id, customer.is_active)}>
                        <button
                          type="submit"
                          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                            customer.is_active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {customer.is_active ? 'تعطيل' : 'تفعيل'}
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