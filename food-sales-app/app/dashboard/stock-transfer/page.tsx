// app/dashboard/stock-transfer/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { transferStockAction } from '../../actions/stockActions';

async function getTransferData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // جلب المواقع (المخازن والسيارات)
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, type')
    .eq('is_active', true)
    .order('type', { ascending: true });

  // جلب المنتجات النشطة
  const { data: products } = await supabase
    .from('products')
    .select('id, name, barcode')
    .eq('is_active', true)
    .order('name', { ascending: true });

  // جلب آخر 10 حركات تحويل
  const { data: movements } = await supabase
    .from('stock_movements')
    .select(`
      id,
      quantity,
      movement_type,
      notes,
      created_at,
      products (name),
      from_locations:locations!stock_movements_from_location_id_fkey (name),
      to_locations:locations!stock_movements_to_location_id_fkey (name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    locations: locations || [],
    products: products || [],
    movements: movements || []
  };
}

export default async function StockTransferPage() {
  const { locations, products, movements } = await getTransferData();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">تحويل المخزون</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* نموذج التحويل */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 sticky top-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-2xl">🔄</span> نقل بضاعة جديد
            </h2>
            
            <form action={transferStockAction} className="space-y-4">
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
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <span>📦 تنفيذ التحويل</span>
              </button>
            </form>
          </div>
        </div>

        {/* جدول سجل الحركات */}
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