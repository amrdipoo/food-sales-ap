// app/dashboard/payments/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import {
  getCustomersWithPendingInvoices,
  getCustomerPendingInvoices,
  getInvoiceDetails,
  recordPaymentAction,
  getActiveCollectors,
} from '../../actions/paymentActions';

export default function PaymentsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedCollectorId, setSelectedCollectorId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);
        setSelectedCollectorId(user.id);

        const [custData, collData] = await Promise.all([
          getCustomersWithPendingInvoices(),
          getActiveCollectors(),
        ]);

        setCustomers(custData);
        setCollectors(collData);
      } catch (err: any) {
        console.error('خطأ في تحميل البيانات:', err);
        setMessage({ type: 'error', text: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [router]);

  // جلب فواتير العميل عند اختياره
  useEffect(() => {
    const loadInvoices = async () => {
      if (!selectedCustomerId) {
        setInvoices([]);
        setSelectedInvoiceId('');
        setInvoiceDetails(null);
        return;
      }
      const data = await getCustomerPendingInvoices(selectedCustomerId);
      setInvoices(data);
      setSelectedInvoiceId('');
      setInvoiceDetails(null);
      setAmount('');
    };
    loadInvoices();
  }, [selectedCustomerId]);

  // جلب تفاصيل الفاتورة عند اختيارها
  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedInvoiceId) {
        setInvoiceDetails(null);
        setAmount('');
        return;
      }
      const data = await getInvoiceDetails(selectedInvoiceId);
      setInvoiceDetails(data);
      if (data) {
        setAmount(data.remaining.toFixed(2));
      }
    };
    loadDetails();
  }, [selectedInvoiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('invoice_id', selectedInvoiceId);
      formData.append('customer_id', selectedCustomerId);
      formData.append('amount', amount);
      formData.append('payment_method', paymentMethod);
      formData.append('collector_id', selectedCollectorId);
      formData.append('notes', notes);

      const result = await recordPaymentAction(formData);
      if (result.success) {
        // ✅ إضافة قيمة افتراضية لـ result.message
        setMessage({ type: 'success', text: result.message || 'تم تسجيل الدفعة بنجاح' });
        // إعادة تعيين النموذج
        setSelectedCustomerId('');
        setSelectedInvoiceId('');
        setInvoices([]);
        setInvoiceDetails(null);
        setAmount('');
        setNotes('');
        // تحديث قائمة العملاء
        const custData = await getCustomersWithPendingInvoices();
        setCustomers(custData);
      } else {
        setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء تسجيل الدفعة' });
      }
    } catch (err: any) {
      console.error('خطأ في تسجيل الدفعة:', err);
      setMessage({ type: 'error', text: err.message || 'حدث خطأ غير متوقع' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-l from-green-600 to-green-700 text-white p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">💰 تسجيل دفعات</h1>
          <p className="text-green-100 mt-1">تسجيل دفعات العملاء وتحصيل الفواتير الآجلة</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">تسجيل دفعة جديدة</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اختر العميل <span className="text-red-500">*</span></label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - المديونية: {c.totalDebt.toFixed(2)} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h3 className="font-bold text-blue-900">معلومات العميل</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div><span className="text-gray-600">الاسم:</span> {selectedCustomer.name}</div>
                      <div><span className="text-gray-600">إجمالي الديون:</span> <span className="font-bold text-red-700">{selectedCustomer.totalDebt.toFixed(2)} ج.م</span></div>
                      <div><span className="text-gray-600">عدد الفواتير:</span> {selectedCustomer.invoicesCount}</div>
                    </div>
                  </div>
                )}

                {selectedCustomerId && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">اختر الفاتورة <span className="text-red-500">*</span></label>
                    {invoices.length === 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                        لا توجد فواتير آجلة لهذا العميل
                      </div>
                    ) : (
                      <select
                        value={selectedInvoiceId}
                        onChange={(e) => setSelectedInvoiceId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">-- اختر الفاتورة --</option>
                        {invoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} - المتبقي: {inv.remaining.toFixed(2)} ج.م
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {invoiceDetails && (
                  <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 mb-2">تفاصيل الفاتورة</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-gray-600">رقم الفاتورة:</span><p className="font-bold">{invoiceDetails.invoice_number}</p></div>
                      <div><span className="text-gray-600">الإجمالي:</span><p className="font-bold">{Number(invoiceDetails.total_amount).toFixed(2)} ج.م</p></div>
                      <div><span className="text-gray-600">المدفوع:</span><p className="font-bold text-green-700">{Number(invoiceDetails.paid_amount || 0).toFixed(2)} ج.م</p></div>
                      <div><span className="text-gray-600">المتبقي:</span><p className="font-bold text-red-700">{invoiceDetails.remaining.toFixed(2)} ج.م</p></div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">المبلغ <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                  {invoiceDetails && (
                    <p className="text-xs text-gray-500 mt-1">الحد الأقصى: {invoiceDetails.remaining.toFixed(2)} ج.م</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="cash">💵 نقدي</option>
                    <option value="bank_transfer">🏦 تحويل بنكي</option>
                    <option value="check">📝 شيك</option>
                    <option value="credit_card">💳 بطاقة ائتمان</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">المحصل</label>
                  <select
                    value={selectedCollectorId}
                    onChange={(e) => setSelectedCollectorId(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">-- اختر المحصل --</option>
                    {collectors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات إضافية (اختياري)"
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCustomerId || !selectedInvoiceId || !amount}
                  className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSubmitting ? 'جاري التسجيل...' : '💾 تسجيل الدفعة'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📊 ملخص العملاء</h3>
              <div className="space-y-3">
                {customers.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">لا يوجد عملاء بديون</p>
                ) : (
                  customers.slice(0, 5).map((c) => (
                    <div key={c.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{c.name}</span>
                        <span className="font-bold text-red-700">{c.totalDebt.toFixed(2)} ج.م</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{c.invoicesCount} فاتورة آجلة</div>
                    </div>
                  ))
                )}
                {customers.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">+ {customers.length - 5} عملاء آخرون</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}