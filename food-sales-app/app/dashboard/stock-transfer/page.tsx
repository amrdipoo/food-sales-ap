// app/dashboard/stock-transfer/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { transferStockAction } from '../../actions/stockActions';

interface Location {
  id: string;
  name: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
}

interface Movement {
  id: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  products: { name: string } | null;
  from_locations: { name: string } | null;
  to_locations: { name: string } | null;
}

export const dynamic = 'force-dynamic';

export default function StockTransferPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ✅ دالة تحميل البيانات (يمكن استدعاؤها مجدداً)
const loadData = useCallback(async () => {
  try {
    const response = await fetch('/api/stock-transfer-data', {
      cache: 'no-store', // ✅ منع التخزين المؤقت
    });
    if (response.ok) {
      const data = await response.json();
      setLocations(data.locations || []);
      setProducts(data.products || []);
      setMovements(data.movements || []);
    }
  } catch (error) {
    console.error('خطأ في تحميل البيانات:', error);
  } finally {
    setIsLoading(false);
  }
}, []);

  // ✅ تحميل البيانات عند أول تحميل للصفحة
  useEffect(() => {
    loadData();
  }, [loadData]);

const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsSubmitting(true);
  setMessage(null);

  const formData = new FormData(e.currentTarget);
  const result = await transferStockAction(formData);

  if (result.success) {
    // ✅ إضافة الحركة الجديدة إلى القائمة محلياً
    const newMovement: Movement = {
      id: Date.now().toString(), // معرف مؤقت (سيتم تحديثه عند إعادة الجلب)
      quantity: parseFloat(formData.get('quantity') as string),
      notes: (formData.get('notes') as string) || null,
      created_at: new Date().toISOString(),
      products: { name: products.find(p => p.id === formData.get('product_id'))?.name || 'غير معروف' },
      from_locations: { name: locations.find(l => l.id === formData.get('from_location_id'))?.name || 'غير محدد' },
      to_locations: { name: locations.find(l => l.id === formData.get('to_location_id'))?.name || 'غير محدد' },
    };
    setMovements(prev => [newMovement, ...prev]); // إضافة في البداية

    // ✅ إعادة تحميل البيانات من الخادم للتحديث الدقيق (اختياري)
    await loadData();

    setMessage({ type: 'success', text: result.message || '✅ تم تحويل المخزون بنجاح' });
    router.push('/dashboard/stock-transfer?success=true');
  } else {
    setMessage({ type: 'error', text: result.error || '❌ فشل تحويل المخزون' });
  }
  setIsSubmitting(false);
};

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">🔄 تحويل المخزون</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔄</span> نقل بضاعة جديد
            </h2>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من الموقع (المصدر)</label>
                <select name="from_location_id" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- اختر الموقع المصدر --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.type === 'store' ? '🏪' : '🚚'} {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى الموقع (الوجهة)</label>
                <select name="to_location_id" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- اختر الموقع الوجهة --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.type === 'store' ? '🏪' : '🚚'} {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنتج</label>
                <select name="product_id" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- اختر المنتج --</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (باركود: {prod.barcode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المراد تحويلها</label>
                <input
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="سبب التحويل، اسم السائق، إلخ..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    جاري التنفيذ...
                  </>
                ) : (
                  <>
                    <span>📦</span> تنفيذ التحويل
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-700">📜 سجل آخر حركات التحويل</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">المنتج</th>
                    <th className="p-4">الكمية</th>
                    <th className="p-4">من</th>
                    <th className="p-4">إلى</th>
                    <th className="p-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        لا توجد حركات تحويل مسجلة حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    movements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-sm text-gray-600">{formatDate(mov.created_at)}</td>
                        <td className="p-4 font-medium text-gray-800">{mov.products?.name || 'غير معروف'}</td>
                        <td className="p-4 font-bold text-blue-700">{Number(mov.quantity).toLocaleString()}</td>
                        <td className="p-4 text-sm text-gray-600">
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                            {mov.from_locations?.name || 'غير محدد'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                            {mov.to_locations?.name || 'غير محدد'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500 max-w-xs truncate" title={mov.notes || ''}>
                          {mov.notes || '-'}
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