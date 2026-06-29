// app/dashboard/reports/ReportsClientView.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { getFinancialReports } from '../../actions/reportActions';
import { useRouter } from 'next/navigation';

interface Customer { id: string; name: string; phone: string; }

export default function ReportsClientView({
  customers,
  initialFilters
}: {
  customers: Customer[];
  initialFilters: Record<string, string>;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-center text-gray-500">جاري التحميل...</div>}>
      <ReportsContent customers={customers} initialFilters={initialFilters} />
    </Suspense>
  );
}

function ReportsContent({
  customers,
  initialFilters
}: {
  customers: Customer[];
  initialFilters: Record<string, string>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const [filters, setFilters] = useState({
    invoiceNumber: initialFilters.invoiceNumber || '',
    customerId: initialFilters.customerId || '',
    fromDate: initialFilters.fromDate || '',
    toDate: initialFilters.toDate || '',
  });

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getFinancialReports(filters);
      setReports(data);
    } catch (error) {
      console.error('خطأ في تحميل التقارير:', error);
    }
    setLoading(false);
  };

  const handleFilterChange = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    router.push(`/dashboard/reports?${params.toString()}`);
    loadReports();
  };

  const handleReset = () => {
    setFilters({ invoiceNumber: '', customerId: '', fromDate: '', toDate: '' });
    router.push('/dashboard/reports');
    setTimeout(() => loadReports(), 100);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'ُEG' }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✓ مدفوعة</span>;
      case 'partial': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">◐ جزئي</span>;
      case 'pending': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">○ معلقة</span>;
      case 'deleted': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">🗑️ محذوفة</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800">📈 التقارير المالية المتقدمة</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-2xl">🔍</span> بحث متقدم
        </h2>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رقم الفاتورة</label>
              <input type="text" value={filters.invoiceNumber} onChange={(e) => handleFilterChange('invoiceNumber', e.target.value)} placeholder="ابحث برقم الفاتورة..." className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">العميل</label>
              <select value={filters.customerId} onChange={(e) => handleFilterChange('customerId', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                <option value="">جميع العملاء</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">من تاريخ</label>
              <input type="date" value={filters.fromDate} onChange={(e) => handleFilterChange('fromDate', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى تاريخ</label>
              <input type="date" value={filters.toDate} onChange={(e) => handleFilterChange('toDate', e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? '⏳ جاري البحث...' : '🔍 بحث'}
            </button>
            <button type="button" onClick={handleReset} className="bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-200">
              🔄 إعادة تعيين
            </button>
          </div>
        </form>
      </div>

{/* البطاقات الإحصائية */}
{reports?.summary && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
    {/* بطاقة 1: إجمالي المبيعات */}
    <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-r-blue-500">
      <p className="text-gray-500 text-sm">إجمالي المبيعات</p>
      <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(reports.summary.totalSales)}</p>
      <p className="text-xs text-gray-500 mt-1">{reports.summary.invoiceCount} فاتورة</p>
    </div>

    {/* 🆕 بطاقة 2: الفواتير النقدية */}
    <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-r-green-500">
      <p className="text-gray-500 text-sm">💵 الفواتير النقدية</p>
      <p className="text-2xl font-bold text-green-700 mt-2">{formatCurrency(reports.summary.totalCashInvoices)}</p>
      <p className="text-xs text-gray-500 mt-1">{reports.summary.cashInvoicesCount} فاتورة مدفوعة بالكامل</p>
    </div>

    {/* 🆕 بطاقة 3: الفواتير الآجلة */}
    <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-r-orange-500">
      <p className="text-gray-500 text-sm">📝 الفواتير الآجلة</p>
      <p className="text-2xl font-bold text-orange-700 mt-2">{formatCurrency(reports.summary.totalCreditInvoices)}</p>
      <p className="text-xs text-gray-500 mt-1">{reports.summary.creditInvoicesCount} فاتورة (جزئي/آجل)</p>
    </div>

    {/* بطاقة 4: إجمالي المحصل */}
    <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-r-emerald-500">
      <p className="text-gray-500 text-sm">💰 إجمالي المحصل</p>
      <p className="text-2xl font-bold text-emerald-700 mt-2">{formatCurrency(reports.summary.totalCollected)}</p>
      <p className="text-xs text-gray-500 mt-1">{reports.summary.collectionCount} عملية تحصيل</p>
    </div>

    {/* بطاقة 5: الديون المتبقية */}
    <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-r-red-500">
      <p className="text-gray-500 text-sm">⚠️ الديون المتبقية</p>
      <p className="text-2xl font-bold text-red-700 mt-2">{formatCurrency(reports.summary.remainingDebt)}</p>
      <p className="text-xs text-gray-500 mt-1">
        {reports.summary.totalSales > 0 
          ? `${((reports.summary.remainingDebt / reports.summary.totalSales) * 100).toFixed(1)}% من المبيعات`
          : 'لا توجد ديون'}
      </p>
    </div>
  </div>
)}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-700">📄 الفواتير</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="p-4">رقم الفاتورة</th>
                <th className="p-4">العميل</th>
                <th className="p-4">المندوب</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">الإجمالي</th>
                <th className="p-4">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td></tr>
              ) : reports?.invoices?.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">لا توجد فواتير</td></tr>
              ) : (
                reports?.invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <button onClick={() => setSelectedInvoice(inv)} className="text-blue-600 hover:underline font-mono font-bold hover:text-blue-800 transition-colors">
                        {inv.invoice_number}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{inv.customers?.name || 'عميل نقدي'}</div>
                      <div className="text-xs text-gray-500">{inv.customers?.phone || ''}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{inv.sales_rep?.full_name || 'غير معروف'}</td>
                    <td className="p-4 text-sm">{formatDate(inv.created_at)}</td>
                    <td className="p-4 font-bold">{formatCurrency(Number(inv.total_amount))}</td>
                    <td className="p-4">{getStatusBadge(inv.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-700">💰 عمليات التحصيل</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="p-4">التاريخ</th>
                <th className="p-4">العميل</th>
                <th className="p-4">المندوب المحصل</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">طريقة الدفع</th>
                <th className="p-4">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports?.collections?.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">لا توجد عمليات تحصيل</td></tr>
              ) : (
                reports?.collections?.map((trans: any) => (
                  <tr key={trans.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm">{formatDate(trans.created_at)}</td>
                    <td className="p-4 font-medium">{trans.customers?.name || 'عميل نقدي'}</td>
                    <td className="p-4 text-sm text-blue-700 font-medium">{trans.collector?.full_name || 'غير معروف'}</td>
                    <td className="p-4 font-bold text-green-700">{formatCurrency(Number(trans.amount))}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700">
                        {trans.payment_method === 'cash' ? '💵 نقدي' : '🏦 تحويل'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{trans.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-800">🧾 تفاصيل الفاتورة: {selectedInvoice.invoice_number}</h3>
                <p className="text-sm text-gray-500 mt-1">تاريخ الإصدار: {formatDate(selectedInvoice.created_at)}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-red-600 text-3xl leading-none transition-colors">&times;</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div>
                  <p className="text-xs text-gray-500">العميل</p>
                  <p className="font-bold text-gray-800">{selectedInvoice.customers?.name || 'عميل نقدي'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">مندوب المبيعات</p>
                  <p className="font-bold text-gray-800">{selectedInvoice.sales_rep?.full_name || 'غير معروف'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">حالة الفاتورة</p>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">الإجمالي / المدفوع</p>
                  <p className="font-bold text-gray-800">
                    {formatCurrency(Number(selectedInvoice.total_amount))} / <span className="text-green-600">{formatCurrency(Number(selectedInvoice.paid_amount))}</span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">📦 بنود الفاتورة</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="p-3">المنتج</th>
                        <th className="p-3">السعر</th>
                        <th className="p-3">الكمية</th>
                        <th className="p-3">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoice.items?.length > 0 ? (
                        selectedInvoice.items.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 font-medium">{item.products?.name || 'منتج محذوف'}</td>
                            <td className="p-3">{formatCurrency(Number(item.unit_price))}</td>
                            <td className="p-3 text-center">{item.quantity}</td>
                            <td className="p-3 font-bold text-blue-700">{formatCurrency(Number(item.total))}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="p-4 text-center text-gray-500">لا توجد بنود مسجلة</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الإجمالي:</span>
                    <span className="font-bold">{formatCurrency(Number(selectedInvoice.total_amount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الخصم:</span>
                    <span className="font-bold text-red-600">- {formatCurrency(Number(selectedInvoice.discount || 0))}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>الصافي:</span>
                    <span className="text-blue-700">{formatCurrency(Number(selectedInvoice.total_amount) - Number(selectedInvoice.discount || 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
              <button onClick={() => setSelectedInvoice(null)} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
