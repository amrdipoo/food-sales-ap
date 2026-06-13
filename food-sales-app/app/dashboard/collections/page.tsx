// app/dashboard/collections/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addCollectionAction } from '../../actions/collectionActions';

async function getCollectionsData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // جلب العملاء الذين عليهم رصيد (مرتبين من الأعلى للأقل)
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, current_balance')
    .gt('current_balance', 0)
    .order('current_balance', { ascending: false });

  // جلب آخر 10 عمليات تحصيل
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      payment_method,
      notes,
      created_at,
      customers (name)
    `)
    .eq('transaction_type', 'collection')
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    customers: customers || [],
    transactions: transactions || []
  };
}

export default async function CollectionsPage() {
  const { customers, transactions } = await getCollectionsData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  const getMethodLabel = (method: string) => {
    switch(method) {
      case 'cash': return '💵 نقدي';
      case 'bank_transfer': return '🏦 تحويل بنكي';
      case 'check': return '📝 شيك';
      default: return method;
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">سند قبض (التحصيل)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* نموذج التحصيل */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-2xl">🧾</span> تسجيل دفعة جديدة
            </h2>
            
            <form action={addCollectionAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر العميل</label>
                <select name="customer_id" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- اختر العميل --</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} (عليه: {formatCurrency(Number(cust.current_balance))})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المحصل (ر.س)</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                <select name="payment_method" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="cash">💵 نقدي</option>
                  <option value="bank_transfer">🏦 تحويل بنكي</option>
                  <option value="check">📝 شيك</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="رقم الشيك، اسم البنك، إلخ..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <span>💾 حفظ سند القبض</span>
              </button>
            </form>
          </div>
        </div>

        {/* جدول آخر عمليات التحصيل */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-700">📜 سجل آخر عمليات التحصيل</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">المبلغ</th>
                    <th className="p-4">طريقة الدفع</th>
                    <th className="p-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        لا توجد عمليات تحصيل مسجلة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((trans) => (
                      <tr key={trans.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm text-gray-600">{formatDate(trans.created_at)}</td>
                        <td className="p-4 font-medium text-gray-800">{trans.customers?.name || 'غير معروف'}</td>
                        <td className="p-4 font-bold text-green-700">{formatCurrency(Number(trans.amount))}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {getMethodLabel(trans.payment_method)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={trans.notes || ''}>
                          {trans.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}