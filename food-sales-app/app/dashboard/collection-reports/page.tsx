// app/dashboard/collection-reports/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import {
  getCollectionReports,
  getFilterOptions,
  CollectionReportFilters,
} from '../../actions/collectionReportActions';

export default function CollectionReportsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filterOptions, setFilterOptions] = useState<any>({
    collectors: [],
    customers: [],
    paymentMethods: [],
  });

  // حالات الفلاتر
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [collectorId, setCollectorId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  // تحميل البيانات الأولية
  useEffect(() => {
    const init = async () => {
      try {
        // ✅ استخدام getUser() بدلاً من getSession()
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const options = await getFilterOptions();
        setFilterOptions(options);

        // تحديد الفترة الافتراضية (آخر 30 يوم)
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);

        setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
        setToDate(today.toISOString().split('T')[0]);

        // جلب التقرير الأولي
        const data = await getCollectionReports({
          fromDate: thirtyDaysAgo.toISOString().split('T')[0],
          toDate: today.toISOString().split('T')[0],
        });
        setReportData(data);
      } catch (err: any) {
        console.error('خطأ في التحميل:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  // تطبيق الفلاتر
  const applyFilters = async () => {
    setIsFetching(true);
    const filters: CollectionReportFilters = {};
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    if (collectorId) filters.collectorId = collectorId;
    if (customerId) filters.customerId = customerId;
    if (paymentMethod) filters.paymentMethod = paymentMethod;

    const data = await getCollectionReports(filters);
    setReportData(data);
    setIsFetching(false);
  };

  // إعادة تعيين الفلاتر
  const resetFilters = () => {
    setCollectorId('');
    setCustomerId('');
    setPaymentMethod('');
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setToDate(today.toISOString().split('T')[0]);
  };

  // طباعة التقرير
  const printReport = () => {
    if (!reportData) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }

    const paymentMethodLabel = (method: string) => {
      const labels: Record<string, string> = {
        cash: 'نقدي',
        bank_transfer: 'تحويل بنكي',
        check: 'شيك',
        credit_card: 'بطاقة ائتمان',
      };
      return labels[method] || method;
    };

    const rows = reportData.collections
      .map(
        (c: any) => `
      <tr>
        <td>${new Date(c.created_at).toLocaleDateString('ar-EG')}</td>
        <td>${c.customer?.name || 'عميل نقدي'}</td>
        <td>${c.collector?.full_name || 'غير معروف'}</td>
        <td>${paymentMethodLabel(c.payment_method)}</td>
        <td>${c.invoice_number || '-'}</td>
        <td style="text-align:left;font-weight:bold;">${Number(c.amount).toFixed(2)} ج.م</td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير التحصيلات</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Tahoma, Arial, sans-serif; padding: 20px; color: #000; }
    .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { font-size: 24px; color: #2563eb; margin-bottom: 5px; }
    .header p { font-size: 12px; color: #666; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
    .summary-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; text-align: center; }
    .summary-box .label { font-size: 12px; color: #0369a1; margin-bottom: 5px; }
    .summary-box .value { font-size: 20px; font-weight: bold; color: #0c4a6e; }
    .filters { background: #f9fafb; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #2563eb; color: white; padding: 10px; text-align: right; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 20px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
    @media print {
      body { padding: 10px; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💼 تقرير التحصيلات</h1>
    <p>نظام إدارة المبيعات المتكامل</p>
    <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
  </div>

  <div class="filters">
    <strong>📋 فترة التقرير:</strong> ${fromDate || 'منذ البداية'} إلى ${toDate || 'حتى الآن'}
    ${collectorId ? ` | <strong>المندوب:</strong> ${filterOptions.collectors.find((c: any) => c.id === collectorId)?.full_name}` : ''}
    ${customerId ? ` | <strong>العميل:</strong> ${filterOptions.customers.find((c: any) => c.id === customerId)?.name}` : ''}
    ${paymentMethod ? ` | <strong>طريقة الدفع:</strong> ${paymentMethodLabel(paymentMethod)}` : ''}
  </div>

  <div class="summary">
    <div class="summary-box">
      <div class="label">إجمالي التحصيلات</div>
      <div class="value">${reportData.summary.totalAmount.toFixed(2)} ج.م</div>
    </div>
    <div class="summary-box">
      <div class="label">عدد السندات</div>
      <div class="value">${reportData.summary.totalCount}</div>
    </div>
    <div class="summary-box">
      <div class="label">متوسط السند</div>
      <div class="value">${reportData.summary.avgAmount.toFixed(2)} ج.م</div>
    </div>
  </div>

  <h2 style="font-size: 16px; margin-bottom: 10px; color: #2563eb;">📊 تفاصيل التحصيلات (${reportData.collections.length})</h2>
  <table>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>العميل</th>
        <th>المندوب</th>
        <th>طريقة الدفع</th>
        <th>رقم الفاتورة</th>
        <th style="text-align:left;">المبلغ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <p>✨ تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة المبيعات ✨</p>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
    `);
    printWindow.document.close();
  };

  // تصدير CSV
	const exportCSV = () => {
  if (!reportData || reportData.collections.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  const paymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'نقدي',
      bank_transfer: 'تحويل بنكي',
      check: 'شيك',
      credit_card: 'بطاقة ائتمان',
    };
    return labels[method] || method;
  };

  const headers = ['التاريخ', 'العميل', 'الهاتف', 'المندوب', 'طريقة الدفع', 'رقم الفاتورة', 'المبلغ', 'ملاحظات'];
  const rows = reportData.collections.map((c: any) => [
    new Date(c.created_at).toLocaleDateString('ar-EG'),
    c.customer?.name || 'عميل نقدي',
    c.customer?.phone || '',
    c.collector?.full_name || 'غير معروف',
    paymentMethodLabel(c.payment_method),
    c.invoice_number || '',
    Number(c.amount).toFixed(2),
    c.notes || '',
  ]);

  // ✅ إصلاح: إضافة نوع any لـ cell
  const csvContent =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map((cell: any) => `"${cell}"`).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `تقرير_التحصيلات_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل تقرير التحصيلات...</p>
        </div>
      </div>
    );
  }

  const summary = reportData?.summary || {
    totalAmount: 0,
    totalCount: 0,
    avgAmount: 0,
    cashAmount: 0,
    bankAmount: 0,
    otherAmount: 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* رأس الصفحة */}
        <div className="bg-gradient-to-l from-emerald-600 to-emerald-700 text-white p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">💼 تقارير التحصيلات</h1>
              <p className="text-emerald-100 mt-1">تحليل شامل لسندات القبض والتحصيلات</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={printReport}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                🖨️ طباعة
              </button>
              <button
                onClick={exportCSV}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                📊 تصدير Excel
              </button>
            </div>
          </div>
        </div>

        {/* الفلاتر */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            🔍 فلاتر البحث
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">المندوب</label>
              <select
                value={collectorId}
                onChange={(e) => setCollectorId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">الكل</option>
                {filterOptions.collectors.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">العميل</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">الكل</option>
                {filterOptions.customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">الكل</option>
                {filterOptions.paymentMethods.map((pm: any) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={applyFilters}
              disabled={isFetching}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
            >
              {isFetching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  جاري البحث...
                </>
              ) : (
                <>🔍 تطبيق الفلاتر</>
              )}
            </button>
            <button
              onClick={resetFilters}
              className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-300 transition-colors"
            >
              🔄 إعادة تعيين
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-sm">إجمالي التحصيلات</p>
                <p className="text-3xl font-bold mt-2">{summary.totalAmount.toFixed(2)}</p>
                <p className="text-emerald-100 text-xs mt-1">جنيه مصري</p>
              </div>
              <div className="text-4xl opacity-50">💰</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm">عدد السندات</p>
                <p className="text-3xl font-bold mt-2">{summary.totalCount}</p>
                <p className="text-blue-100 text-xs mt-1">سند قبض</p>
              </div>
              <div className="text-4xl opacity-50">📄</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-purple-100 text-sm">متوسط السند</p>
                <p className="text-3xl font-bold mt-2">{summary.avgAmount.toFixed(2)}</p>
                <p className="text-purple-100 text-xs mt-1">جنيه مصري</p>
              </div>
              <div className="text-4xl opacity-50">📊</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-sm">التحصيلات النقدية</p>
                <p className="text-3xl font-bold mt-2">{summary.cashAmount.toFixed(2)}</p>
                <p className="text-orange-100 text-xs mt-1">جنيه مصري</p>
              </div>
              <div className="text-4xl opacity-50">💵</div>
            </div>
          </div>
        </div>

        {/* توزيع طرق الدفع */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💳 توزيع طرق الدفع</h3>
            <div className="space-y-3">
              {reportData?.paymentMethods?.map((pm: any) => {
                const percentage =
                  summary.totalAmount > 0
                    ? (pm.totalAmount / summary.totalAmount) * 100
                    : 0;
                const labels: Record<string, string> = {
                  cash: '💵 نقدي',
                  bank_transfer: '🏦 تحويل بنكي',
                  check: '📝 شيك',
                  credit_card: '💳 بطاقة ائتمان',
                };
                const colors: Record<string, string> = {
                  cash: 'bg-green-500',
                  bank_transfer: 'bg-blue-500',
                  check: 'bg-purple-500',
                  credit_card: 'bg-orange-500',
                };
                return (
                  <div key={pm.method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{labels[pm.method] || pm.method}</span>
                      <span className="text-gray-600">
                        {pm.totalAmount.toFixed(2)} ج.م ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${colors[pm.method] || 'bg-gray-500'} h-3 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pm.count} سند</p>
                  </div>
                );
              })}
              {(!reportData?.paymentMethods || reportData.paymentMethods.length === 0) && (
                <p className="text-center text-gray-500 py-4">لا توجد بيانات</p>
              )}
            </div>
          </div>

          {/* أفضل المندوبين */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">👨‍💼 أفضل المندوبين تحصيلاً</h3>
            <div className="space-y-3">
              {reportData?.collectors?.slice(0, 5).map((c: any, idx: number) => (
                <div
                  key={c.user_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        idx === 0
                          ? 'bg-yellow-500'
                          : idx === 1
                          ? 'bg-gray-400'
                          : idx === 2
                          ? 'bg-orange-600'
                          : 'bg-blue-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.count} سند</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-emerald-600">{c.totalAmount.toFixed(2)} ج.م</p>
                  </div>
                </div>
              ))}
              {(!reportData?.collectors || reportData.collectors.length === 0) && (
                <p className="text-center text-gray-500 py-4">لا توجد بيانات</p>
              )}
            </div>
          </div>
        </div>

        {/* جدول التحصيلات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">
              📋 تفاصيل التحصيلات ({reportData?.collections?.length || 0})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">المندوب</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportData?.collections?.length === 0 || !reportData?.collections ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      لا توجد تحصيلات في الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  reportData.collections.map((c: any) => {
                    const pmLabels: Record<string, string> = {
                      cash: '💵 نقدي',
                      bank_transfer: '🏦 تحويل',
                      check: '📝 شيك',
                      credit_card: '💳 بطاقة',
                    };
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-sm text-gray-600">
                          {new Date(c.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-gray-900">{c.customer?.name || 'عميل نقدي'}</p>
                          {c.customer?.phone && (
                            <p className="text-xs text-gray-500">{c.customer.phone}</p>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-700">
                          {c.collector?.full_name || 'غير معروف'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                            {pmLabels[c.payment_method] || c.payment_method}
                          </span>
                        </td>
                        <td className="p-3">
                          {c.invoice_number ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                              {c.invoice_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-emerald-600">
                          {Number(c.amount).toFixed(2)} ج.م
                        </td>
                        <td className="p-3 text-sm text-gray-600 max-w-xs truncate">
                          {c.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}