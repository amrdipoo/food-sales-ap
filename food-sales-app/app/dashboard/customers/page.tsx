// app/dashboard/customers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { addCustomerAction, toggleCustomerStatusAction } from '../../actions/customerActions';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  current_balance: number;
  created_at: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // تحميل البيانات
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('خطأ في تحميل العملاء:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ دالة معالجة إضافة عميل
  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await addCustomerAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم إضافة العميل بنجاح' });
      await loadCustomers();
      e.currentTarget.reset();
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل إضافة العميل' });
    }
    setIsSubmitting(false);
  };

  // ✅ دالة تبديل حالة العميل
  const handleToggleStatus = async (customerId: string, currentStatus: boolean) => {
    const result = await toggleCustomerStatusAction(customerId, currentStatus);
    if (result.success) {
      await loadCustomers();
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل تغيير حالة العميل' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">👥 إدارة العملاء</h1>
          <p className="text-blue-100 mt-1">إدارة بيانات العملاء والمعلومات</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* ✅ نموذج إضافة عميل - استخدام handleSubmit بدلاً من action */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">➕</span> إضافة عميل جديد
          </h2>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              name="name"
              required
              placeholder="الاسم الكامل *"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="phone"
              placeholder="رقم الجوال"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              name="address"
              placeholder="العنوان"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isSubmitting ? '⏳ جاري...' : '💾 حفظ العميل'}
            </button>
          </form>
        </div>

        {/* جدول العملاء */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4">الاسم</th>
                  <th className="p-4">الجوال</th>
                  <th className="p-4">العنوان</th>
                  <th className="p-4">الرصيد</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      لا يوجد عملاء حتى الآن.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{customer.name}</td>
                      <td className="p-4" dir="ltr">{customer.phone || '-'}</td>
                      <td className="p-4">{customer.address || '-'}</td>
                      <td className="p-4 font-bold text-blue-700">
                        {Number(customer.current_balance).toFixed(2)} ج.م
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${customer.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {customer.is_active ? '✅ نشط' : '❌ غير نشط'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(customer.id, customer.is_active)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {customer.is_active ? 'تعطيل' : 'تفعيل'}
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