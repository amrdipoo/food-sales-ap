// app/dashboard/products/add/AddProductForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addProductAction } from '../../../actions/productActions';

interface Location {
  id: string;
  name: string;
  type: string;
}

interface AddProductFormProps {
  locations: Location[];
}

export default function AddProductForm({ locations }: AddProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [inventoryFields, setInventoryFields] = useState<{ location_id: string; quantity: string }[]>([
    { location_id: '', quantity: '' }
  ]);

  const addInventoryField = () => {
    setInventoryFields([...inventoryFields, { location_id: '', quantity: '' }]);
  };

  const removeInventoryField = (index: number) => {
    if (inventoryFields.length > 1) {
      setInventoryFields(inventoryFields.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    
    // إضافة حقول المخزون
    inventoryFields.forEach((field, index) => {
      if (field.location_id && field.quantity) {
        formData.append('location_id', field.location_id);
        formData.append('quantity', field.quantity);
      }
    });

    try {
      const result = await addProductAction(formData);
      if (result.success) {
        setMessage({ type: 'success', text: '✅ تم إضافة المنتج بنجاح' });
        setTimeout(() => {
          router.push('/dashboard/products');
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || '❌ فشل إضافة المنتج' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'حدث خطأ غير متوقع' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      {message && (
        <div className={`p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">اسم المنتج *</label>
            <input
              type="text"
              name="name"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="أدخل اسم المنتج"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">الباركود *</label>
            <input
              type="text"
              name="barcode"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="أدخل الباركود"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">الفئة</label>
            <input
              type="text"
              name="category"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="أدخل الفئة (اختياري)"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">وحدة القياس</label>
            <select
              name="unit_type"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="piece">قطعة</option>
              <option value="kg">كيلوغرام</option>
              <option value="gram">غرام</option>
              <option value="liter">لتر</option>
              <option value="box">علبة</option>
              <option value="unit">وحدة</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">سعر التكلفة (ج.م)</label>
            <input
              type="number"
              name="cost_price"
              step="0.01"
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">سعر البيع (ج.م) *</label>
            <input
              type="number"
              name="unit_price"
              step="0.01"
              min="0.01"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* حقل المخزون */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-700">📦 المخزون</h3>
            <button
              type="button"
              onClick={addInventoryField}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              + إضافة موقع
            </button>
          </div>

          {inventoryFields.map((field, index) => (
            <div key={index} className="flex gap-4 items-end mb-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600">الموقع</label>
                <select
                  value={field.location_id}
                  onChange={(e) => {
                    const newFields = [...inventoryFields];
                    newFields[index].location_id = e.target.value;
                    setInventoryFields(newFields);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">-- اختر الموقع --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.type === 'vehicle' ? '🚚' : '🏪'} {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600">الكمية</label>
                <input
                  type="number"
                  value={field.quantity}
                  onChange={(e) => {
                    const newFields = [...inventoryFields];
                    newFields[index].quantity = e.target.value;
                    setInventoryFields(newFields);
                  }}
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="الكمية"
                />
              </div>
              {inventoryFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInventoryField(index)}
                  className="text-red-600 hover:text-red-800 text-2xl leading-none pb-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-2">يمكنك إضافة المنتج لأكثر من موقع (مخزن أو سيارة)</p>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? '⏳ جاري الحفظ...' : '💾 حفظ المنتج'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/products')}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}