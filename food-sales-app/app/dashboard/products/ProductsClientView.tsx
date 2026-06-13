// app/dashboard/products/ProductsClientView.tsx
'use client';

import { useState } from 'react';
// ✅ التصحيح: استيراد جميع الدوال مباشرة في أعلى الملف
import { 
  addProductAction, 
  updateProductAction, 
  deleteProductAction, 
  toggleProductStatusAction 
} from '../../actions/productActions';

interface Location { id: string; name: string; type: string; }
interface Product {
  id: string; name: string; category: string; barcode: string; unit_type: string;
  unit_price: number; cost_price: number; is_active: boolean;
  inventory: { quantity: number; locations: { id: string; name: string; type: string; } }[];
}

export default function ProductsClientView({
  initialProducts = [],
  initialLocations = []
}: {
  initialProducts: Product[],
  initialLocations: Location[]
}) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockRows, setStockRows] = useState([{ id: 1 }]);

  const addStockRow = () => setStockRows([...stockRows, { id: Date.now() }]);
  
  const removeStockRow = (id: number) => {
    if (stockRows.length > 1) setStockRows(stockRows.filter(row => row.id !== id));
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const formData = new FormData();
    formData.append('productId', productId);
    const result = await deleteProductAction(formData);
    if (!result.success) {
      alert(`⚠️ تعذر الحذف:\n${result.error}`);
    } else {
      window.location.reload();
    }
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800">إدارة الأصناف والمنتجات</h1>

      {/* نموذج الإضافة */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-2xl">📦</span> إضافة صنف جديد وتوزيعه الأولي
        </h2>
        
        {/* ✅ التصحيح: استخدام الدالة المستوردة مباشرة بدلاً من import ديناميكي */}
        <form action={addProductAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input name="name" required placeholder="اسم المنتج" className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input name="barcode" required placeholder="الباركود" className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <select name="category" className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="مشروبات">🥤 مشروبات</option>
              <option value="مواد غذائية">🍞 مواد غذائية</option>
              <option value="منظفات">🧼 منظفات</option>
              <option value="أخرى">📦 أخرى</option>
            </select>
            <select name="unit_type" className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="قطعة">قطعة</option>
              <option value="كرتون">كرتون</option>
              <option value="كيلو">كيلو</option>
              <option value="علبة">علبة</option>
            </select>
            <input name="cost_price" type="number" step="0.01" placeholder="سعر التكلفة" className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            <input name="unit_price" type="number" step="0.01" required placeholder="سعر البيع" className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <span>📍</span> توزيع المخزون الأولي (اختياري)
              </h3>
              <button type="button" onClick={addStockRow} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors font-medium">
                + إضافة موقع آخر
              </button>
            </div>
            <div className="space-y-3">
              {stockRows.map((row) => (
                <div key={row.id} className="flex gap-3 items-start">
                  <select name="location_id" className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- اختر الموقع --</option>
                    {initialLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.type === 'vehicle' ? '🚚' : '🏪'} {loc.name}
                      </option>
                    ))}
                  </select>
                  <input name="quantity" type="number" step="0.01" min="0" placeholder="الكمية" className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {stockRows.length > 1 && (
                    <button type="button" onClick={() => removeStockRow(row.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
            💾 حفظ المنتج وتوزيع المخزون
          </button>
        </form>
      </div>

      {/* جدول المنتجات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">المنتج / الباركود</th>
                <th className="p-4">التصنيف</th>
                <th className="p-4">الوحدة</th>
                <th className="p-4">سعر البيع</th>
                <th className="p-4">توزيع المخزون</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialProducts.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">لا توجد منتجات مسجلة.</td></tr>
              ) : (
                initialProducts.map((prod) => {
                  const inventoryDetails = prod.inventory?.map((inv, idx) => (
                    <span key={inv.locations?.id || idx} className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md ml-1 mb-1 border border-gray-200">
                      {inv.locations?.type === 'vehicle' ? '🚚' : '🏪'} {inv.locations?.name || 'موقع'}: <strong>{Number(inv.quantity).toLocaleString()}</strong>
                    </span>
                  )) || <span className="text-red-500 text-xs">لا يوجد مخزون</span>;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{prod.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-1" dir="ltr">{prod.barcode}</div>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700">{prod.category}</span></td>
                      <td className="p-4 text-gray-600">{prod.unit_type}</td>
                      <td className="p-4 font-bold text-green-700">{formatCurrency(Number(prod.unit_price))}</td>
                      <td className="p-4 max-w-xs"><div className="flex flex-wrap gap-1">{inventoryDetails}</div></td>
                      <td className="p-4">
                        <form action={toggleProductStatusAction.bind(null, prod.id, prod.is_active)}>
                          <button type="submit" className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${prod.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                            {prod.is_active ? 'نشط' : 'معطل'}
                          </button>
                        </form>
                      </td>
                      <td className="p-4 flex gap-2">
                        <button onClick={() => setEditingProduct(prod)} className="text-sm font-medium px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">✏️ تعديل</button>
                        <button onClick={() => handleDelete(prod.id)} className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors">🗑️ حذف</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة التعديل المنبثقة */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">✏️ تعديل بيانات الصنف</h3>
              <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form action={updateProductAction} className="space-y-4">
              <input type="hidden" name="id" value={editingProduct.id} />
              <input name="name" defaultValue={editingProduct.name} required placeholder="اسم المنتج" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input name="barcode" defaultValue={editingProduct.barcode} required placeholder="الباركود" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-3">
                <select name="category" defaultValue={editingProduct.category} className="p-3 border border-gray-300 rounded-lg bg-white">
                  <option value="مشروبات">🥤 مشروبات</option>
                  <option value="مواد غذائية">🍞 مواد غذائية</option>
                  <option value="منظفات">🧼 منظفات</option>
                  <option value="أخرى">📦 أخرى</option>
                </select>
                <select name="unit_type" defaultValue={editingProduct.unit_type} className="p-3 border border-gray-300 rounded-lg bg-white">
                  <option value="قطعة">قطعة</option>
                  <option value="كرتون">كرتون</option>
                  <option value="كيلو">كيلو</option>
                  <option value="علبة">علبة</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input name="cost_price" type="number" step="0.01" defaultValue={editingProduct.cost_price} placeholder="سعر التكلفة" className="p-3 border border-gray-300 rounded-lg" />
                <input name="unit_price" type="number" step="0.01" defaultValue={editingProduct.unit_price} required placeholder="سعر البيع" className="p-3 border border-gray-300 rounded-lg" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">💾 حفظ التعديلات</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}