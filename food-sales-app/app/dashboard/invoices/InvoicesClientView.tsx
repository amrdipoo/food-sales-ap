// app/dashboard/invoices/InvoicesClientView.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  softDeleteInvoiceAction,
  restoreInvoiceAction,
  updateInvoiceAction,
  getInvoicesList,
} from '../../actions/invoiceActions';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer: {
    name: string;
    phone: string;
  };
  sales_rep: {
    full_name: string;
  };
  total_amount: number;
  paid_amount: number;
  discount: number;
  status: 'pending' | 'partial' | 'paid' | 'deleted';
  created_at: string;
  remaining: number;
}

interface InvoicesClientViewProps {
  initialInvoices: Invoice[];
  userRole?: string | null;
  messages?: {
    updated?: string | null;
    deleted?: string | null;
    restored?: string | null;
  };
}

export default function InvoicesClientView({
  initialInvoices,
  userRole,
  messages,
}: InvoicesClientViewProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // عرض رسائل من Server Component
  const initialMessage = messages?.updated || messages?.deleted || messages?.restored;
  if (initialMessage && !message) {
    setMessage({ type: 'success', text: initialMessage });
  }

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف الفاتورة "${invoiceNumber}"؟\n\nلن يتم حذف الفاتورات التي لها تحصيلات مالية.`)) return;

    setIsLoading(invoiceId);
    setMessage(null);

    const result = await softDeleteInvoiceAction(invoiceId);
    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم حذف الفاتورة بنجاح' });
      const newList = await getInvoicesList();
      setInvoices(newList);
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل حذف الفاتورة' });
    }
    setIsLoading(null);
  };

  const handleRestore = async (invoiceId: string) => {
    if (!confirm('هل أنت متأكد من استعادة هذه الفاتورة؟')) return;

    setIsLoading(invoiceId);
    setMessage(null);

    const result = await restoreInvoiceAction(invoiceId);
    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم استعادة الفاتورة بنجاح' });
      const newList = await getInvoicesList();
      setInvoices(newList);
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل استعادة الفاتورة' });
    }
    setIsLoading(null);
  };

  const handleUpdateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateInvoiceAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم تحديث الفاتورة بنجاح' });
      setEditingInvoice(null);
      const newList = await getInvoicesList();
      setInvoices(newList);
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل تحديث الفاتورة' });
    }
    setIsUpdating(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">✅ مدفوع</span>;
      case 'partial':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">🔄 جزئي</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">⏳ معلق</span>;
      case 'deleted':
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">🗑️ محذوف</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📄 إدارة الفواتير</h1>
        <button
          onClick={() => router.push('/pos')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          🛒 إنشاء فاتورة جديدة
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-4">رقم الفاتورة</th>
                <th className="p-4">العميل</th>
                <th className="p-4">المندوب</th>
                <th className="p-4">الإجمالي</th>
                <th className="p-4">المدفوع</th>
                <th className="p-4">المتبقي</th>
                <th className="p-4">الخصم</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    لا توجد فواتير حتى الآن.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-sm font-bold text-blue-700">
                      {invoice.invoice_number}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{invoice.customer?.name || 'عميل نقدي'}</p>
                      {invoice.customer?.phone && (
                        <p className="text-xs text-gray-500">{invoice.customer.phone}</p>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {invoice.sales_rep?.full_name || 'غير معروف'}
                    </td>
                    <td className="p-4 font-bold text-blue-700">
                      {Number(invoice.total_amount).toFixed(2)} ج.م
                    </td>
                    <td className="p-4 font-bold text-green-700">
                      {Number(invoice.paid_amount).toFixed(2)} ج.م
                    </td>
                    <td className="p-4 font-bold text-orange-700">
                      {Number(invoice.remaining).toFixed(2)} ج.م
                    </td>
                    <td className="p-4 text-gray-600">
                      {Number(invoice.discount).toFixed(2)} ج.م
                    </td>
                    <td className="p-4">{getStatusBadge(invoice.status)}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {invoice.status !== 'deleted' ? (
                          <>
                            <button
                              onClick={() => setEditingInvoice(invoice)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              ✏️ تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                              disabled={isLoading === invoice.id}
                              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                            >
                              {isLoading === invoice.id ? '⏳...' : '🗑️ حذف'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRestore(invoice.id)}
                            disabled={isLoading === invoice.id}
                            className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                          >
                            {isLoading === invoice.id ? '⏳...' : '🔄 استعادة'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تعديل الفاتورة */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">✏️ تعديل الفاتورة</h3>
              <button
                onClick={() => setEditingInvoice(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateInvoice} className="space-y-4">
              <input type="hidden" name="id" value={editingInvoice.id} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الفاتورة</label>
                <input
                  type="text"
                  value={editingInvoice.invoice_number}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">العميل</label>
                <input
                  type="text"
                  value={editingInvoice.customer?.name || 'عميل نقدي'}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الإجمالي (ج.م)</label>
                <input
                  name="total_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingInvoice.total_amount}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المدفوع (ج.م)</label>
                <input
                  name="paid_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingInvoice.paid_amount}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  name="status"
                  defaultValue={editingInvoice.status}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="pending">⏳ معلق</option>
                  <option value="partial">🔄 جزئي</option>
                  <option value="paid">✅ مدفوع</option>
                  <option value="deleted">🗑️ محذوف</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isUpdating ? '⏳ جاري...' : '💾 حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}