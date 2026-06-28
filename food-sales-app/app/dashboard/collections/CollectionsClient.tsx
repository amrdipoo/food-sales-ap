// app/dashboard/collections/CollectionsClient.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getActiveCustomers,
  getCollectionsList,
  createCollectionAction,
  deleteCollectionAction,
  getPendingInvoices,
} from '../../actions/collectionActions';

interface CollectionsClientProps {
  customers: any[];
  currentUser: any;
  collections: any[];
  pendingInvoices: any[];
}

export default function CollectionsClient({
  customers,
  currentUser,
  collections: initialCollections,
  pendingInvoices: initialPendingInvoices,
}: CollectionsClientProps) {
  const router = useRouter();
  const [collections, setCollections] = useState(initialCollections);
  const [allPendingInvoices, setAllPendingInvoices] = useState(initialPendingInvoices);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedInvoiceId('');
    setAmount('');
    if (!customerId) {
      setCustomerInvoices([]);
      return;
    }
    const filtered = allPendingInvoices.filter((inv: any) => inv.customer_id === customerId);
    setCustomerInvoices(filtered);
  };

  const handleInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    if (!invoiceId) {
      setAmount('');
      return;
    }
    const invoice = customerInvoices.find(i => i.id === invoiceId);
    if (invoice) {
      setAmount(invoice.remaining.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) {
        setMessage({ type: 'error', text: 'يرجى اختيار العميل وإدخال مبلغ صحيح' });
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('customer_id', selectedCustomerId);
      formData.append('amount', amount);
      formData.append('payment_method', paymentMethod);
      formData.append('notes', notes);
      formData.append('user_id', currentUser?.id || '');
      if (selectedInvoiceId) formData.append('invoice_id', selectedInvoiceId);

      const result = await createCollectionAction(formData);
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'تم حفظ السند بنجاح' });
        const [newList, updatedPending] = await Promise.all([
          getCollectionsList(),
          getPendingInvoices(),
        ]);
        setCollections(newList);
        setAllPendingInvoices(updatedPending);
        setSelectedCustomerId('');
        setSelectedInvoiceId('');
        setCustomerInvoices([]);
        setAmount('');
        setNotes('');
      } else {
        setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء حفظ السند' });
      }
    } catch (err: any) {
      console.error('خطأ في حفظ السند:', err);
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء الحفظ' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السند؟')) return;
    try {
      const result = await deleteCollectionAction(id);
      if (result.success) {
        setCollections(collections.filter(c => c.id !== id));
        setMessage({ type: 'success', text: 'تم حذف السند' });
      } else {
        setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحذف' });
      }
    } catch (err: any) {
      console.error('خطأ في الحذف:', err);
      setMessage({ type: 'error', text: err.message || 'حدث خطأ أثناء الحذف' });
    }
  };

  const selectedInvoice = customerInvoices.find(i => i.id === selectedInvoiceId);

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-blue-600 text-white p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">سندات القبض</h1>
          <p className="text-blue-100 mt-1">إدارة سندات القبض وتحصيل الفواتير الآجلة</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">إنشاء سند قبض جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">العميل <span className="text-red-500">*</span></label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- اختر العميل --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomerId && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الفاتورة الآجلة (اختياري)</label>
                {customerInvoices.length === 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
                    لا توجد فواتير آجلة لهذا العميل
                  </div>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- بدون ربط بفاتورة (سند عام) --</option>
                    {customerInvoices.map((inv: any) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} - المتبقي: {inv.remaining.toFixed(2)} ج.م
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {selectedInvoice && (
              <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-2">تفاصيل الفاتورة:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-600">رقم الفاتورة:</span><p className="font-bold text-blue-700">{selectedInvoice.invoice_number}</p></div>
                  <div><span className="text-gray-600">الإجمالي:</span><p className="font-bold">{Number(selectedInvoice.total_amount).toFixed(2)} ج.م</p></div>
                  <div><span className="text-gray-600">المدفوع:</span><p className="font-bold text-green-700">{Number(selectedInvoice.paid_amount || 0).toFixed(2)} ج.م</p></div>
                  <div><span className="text-gray-600">المتبقي:</span><p className="font-bold text-red-700">{selectedInvoice.remaining.toFixed(2)} ج.م</p></div>
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              {selectedInvoice && (
                <p className="text-xs text-gray-500 mt-1">الحد الأقصى: {selectedInvoice.remaining.toFixed(2)} ج.م</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">نقدي</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="check">شيك</option>
                <option value="credit_card">بطاقة ائتمان</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية (اختياري)"
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedCustomerId || !amount}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ سند القبض'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">سجل سندات القبض</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">العميل</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4">طريقة الدفع</th>
                  <th className="p-4">الفاتورة المرتبطة</th>
                  <th className="p-4">المحصل</th>
                  <th className="p-4">ملاحظات</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {collections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      لا توجد سندات قبض حتى الآن.
                    </td>
                  </tr>
                ) : (
                  collections.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(c.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-4 font-medium text-gray-900">
                        {c.customer?.name || 'غير معروف'}
                      </td>
                      <td className="p-4 font-bold text-green-700">
                        {Number(c.amount).toFixed(2)} ج.م
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                          {c.payment_method === 'cash' ? 'نقدي' :
                           c.payment_method === 'bank_transfer' ? 'تحويل' :
                           c.payment_method === 'check' ? 'شيك' : 'بطاقة'}
                        </span>
                      </td>
                      <td className="p-4">
                        {c.invoice ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                            {c.invoice.invoice_number}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {c.collector?.full_name || 'غير معروف'}
                      </td>
                      <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                        {c.notes || '-'}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-bold"
                        >
                          حذف
                        </button>
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
  );
}