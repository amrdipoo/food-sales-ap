// app/dashboard/products/ProductsClientView.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  toggleProductStatusAction,
  deleteProductAction,
} from '../../actions/productActions';
import { getProductStockAction } from '../../actions/invoiceActions';

interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  unit_type: string;
  cost_price: number;
  unit_price: number;
  is_active: boolean;
  inventory?: any[];
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface ProductsClientViewProps {
  initialProducts: Product[];
  initialLocations: Location[];
}

export default function ProductsClientView({
  initialProducts,
  initialLocations,
}: ProductsClientViewProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [locations] = useState(initialLocations);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleToggleStatus = async (productId: string, currentStatus: boolean) => {
    if (isLoading) return;
    setIsLoading(productId);
    try {
      const result = await toggleProductStatusAction(productId, currentStatus);
      if (result.success) {
        setProducts(prev =>
          prev.map(p =>
            p.id === productId ? { ...p, is_active: !currentStatus } : p
          )
        );
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    setIsLoading(productId);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      const result = await deleteProductAction(formData);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        alert(result.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">إدارة المنتجات</h1>
        <button
          onClick={() => router.push('/dashboard/products/add')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + إضافة منتج
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-4">الاسم</th>
                <th className="p-4">الفئة</th>
                <th className="p-4">الباركود</th>
                <th className="p-4">الوحدة</th>
                <th className="p-4">سعر التكلفة</th>
                <th className="p-4">سعر البيع</th>
                <th className="p-4">المخزون</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    لا توجد منتجات حتى الآن.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-600">{product.category || '-'}</td>
                    <td className="p-4 text-gray-600 font-mono text-sm">{product.barcode}</td>
                    <td className="p-4 text-gray-600">{product.unit_type || '-'}</td>
                    <td className="p-4 text-gray-600">
                      {Number(product.cost_price).toFixed(2)} ج.م
                    </td>
                    <td className="p-4 font-bold text-blue-700">
                      {Number(product.unit_price).toFixed(2)} ج.م
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {product.inventory && product.inventory.length > 0 ? (
                          product.inventory.map((inv, idx) => {
                            const loc = locations.find(l => l.id === inv.location_id);
                            const quantity = Number(inv.quantity || 0);
                            // ✅ إصلاح Hydration: استخدام toFixed بدلاً من toLocaleString
                            return (
                              <span
                                key={idx}
                                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md ml-1 mb-1 border border-gray-200"
                              >
                                {loc?.type === 'vehicle' ? '🚚' : '🏪'} {loc?.name || 'موقع'}:{' '}
                                <strong>{quantity.toFixed(0)}</strong>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-gray-400 text-xs">لا يوجد مخزون</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/products/edit/${product.id}`)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleToggleStatus(product.id, product.is_active)}
                          disabled={isLoading === product.id}
                          className={`text-sm font-medium ${
                            product.is_active
                              ? 'text-yellow-600 hover:text-yellow-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {isLoading === product.id ? 'جاري...' : product.is_active ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={isLoading === product.id}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          حذف
                        </button>
                      </div>
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