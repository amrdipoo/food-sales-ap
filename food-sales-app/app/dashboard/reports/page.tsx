// app/dashboard/reports/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getFinancialData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // 1. إجمالي المبيعات (من الفواتير)
  const { data: invoicesData } = await supabase
    .from('invoices')
    .select('total_amount, paid_amount');
  
  const totalSales = invoicesData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
  const totalPaidInSales = invoicesData?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0;

  // 2. إجمالي التحصيلات (من جدول المعاملات)
  const { data: collectionsData } = await supabase
    .from('transactions')
    .select('amount')
    .eq('transaction_type', 'collection');
  
  const totalCollected = collectionsData?.reduce((sum, trans) => sum + Number(trans.amount || 0), 0) || 0;

  // 3. أحدث حركات التحصيل (آخر 15 حركة)
  const { data: recentCollections } = await supabase
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
    .limit(15);

  return {
    totalSales,
    totalPaidInSales,
    totalCollected,
    recentCollections: recentCollections || []
  };
}

export default async function ReportsPage() {
  const { totalSales, totalPaidInSales, totalCollected, recentCollections } = await getFinancialData();

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

  // حساب الديون المتبقية (إجمالي المبيعات الآجلة - ما تم تحصيله لاحقاً)
  const creditSales = totalSales - totalPaidInSales;
  const remainingDebt = Math.max(0, creditSales - totalCollected);

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800">📈 التقارير المالية والتحصيلات</h1>

      {/* بطاقات الملخص المالي */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-r-4 border-r-blue-500">
          <p className="text-gray-500 text-sm font-medium">إجمالي المبيعات</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(totalSales)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-r-4 border-r-green-500">
          <p className="text-gray-500 text-sm font-medium">إجمالي ما تم تحصيله</p>
          <p className="text-2xl font-bold text-green-700 mt-2">{formatCurrency(totalCollected)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-r-4 border-r-orange-500">
          <p className="text-gray-500 text-sm font-medium">مبيعات آجلة (غير محصلة)</p>
          <p className="text-2xl font-bold text-orange-700 mt-2">{formatCurrency(creditSales)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-r-4 border-r-red-500">
          <p className="text-gray-500 text-sm font-medium">صافي الديون المتبقية على العملاء</p>
          <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(remainingDebt)}</p>
        </div>
      </div>

      {/* جدول أحدث حركات التحصيل */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-700">📜 أحدث حركات التحصيل (سند القبض)</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            آخر {recentCollections.length} عمليات
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="p-4">التاريخ والوقت</th>
                <th className="p-4">اسم العميل</th>
                <th className="p-4">المبلغ المحصل</th>
                <th className="p-4">طريقة الدفع</th>
                <th className="p-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCollections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    لا توجد عمليات تحصيل مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                recentCollections.map((trans) => (
                  <tr key={trans.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(trans.created_at)}
                    </td>
                    <td className="p-4 font-medium text-gray-800">
                      {trans.customers?.name || 'عميل نقدي / غير محدد'}
                    </td>
                    <td className="p-4 font-bold text-green-700">
                      {formatCurrency(Number(trans.amount))}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
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
  );
}