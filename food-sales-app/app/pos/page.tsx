// app/pos/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { getProductByBarcode, Product } from '../../lib/services/productService';
import { getActiveCustomers, Customer } from '../../lib/services/customerService';
import { getActiveLocations } from '../actions/posActions';
import { submitInvoiceAction } from '../actions/invoiceActions';
import { getCurrentUserAction } from '../actions/userActions'; // 🆕 استيراد جديد


interface CartItem extends Product {
  quantity: number;
  total: number;
}

export default function POSPage() {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  const [locations, setLocations] = useState<{id: string, name: string, type: string}[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // 🆕 حالة جديدة لاسم المستخدم الحالي
  const [currentUserName, setCurrentUserName] = useState<string>('جاري التحميل...');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    
    const loadData = async () => {
      const [custData, locData, userData] = await Promise.all([
        getActiveCustomers(),
        getActiveLocations(),
        getCurrentUserAction() // 🆕 جلب بيانات المستخدم الحالي
      ]);
      
      setCustomers(custData);
      setLocations(locData);
      
      // 🆕 تعيين اسم المستخدم
      if (userData) {
        setCurrentUserName(userData.full_name || userData.email || 'مستخدم غير معروف');
      }
      
      if (locData.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locData[0].id);
      }
    };
    loadData();

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('ar-EG', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    if (!selectedLocationId) {
      setMessage({ type: 'error', text: 'يرجى اختيار المخزن أو السيارة أولاً!' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const product = await getProductByBarcode(barcode);

    if (product) {
      setCart((prevCart) => {
        const existingItem = prevCart.find((item) => item.id === product.id);
        if (existingItem) {
          return prevCart.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
              : item
          );
        } else {
          return [...prevCart, { ...product, quantity: 1, total: product.unit_price }];
        }
      });
      setBarcode('');
    } else {
      setMessage({ type: 'error', text: 'المنتج غير موجود أو الباركود غير صحيح' });
      setBarcode('');
    }
    
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.unit_price }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const selectedCustomerName = customers.find(c => c.id === selectedCustomerId)?.name || 'عميل نقدي (عام)';
  const selectedLocationName = locations.find(l => l.id === selectedLocationId)?.name || 'غير محدد';

  const handleCheckout = async (paymentType: 'cash' | 'credit') => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'السلة فارغة!' });
      return;
    }

    if (!selectedLocationId) {
      setMessage({ type: 'error', text: 'يرجى اختيار المخزن أو السيارة أولاً!' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const invoiceData = {
      type: (selectedLocationId && locations.find(l => l.id === selectedLocationId)?.type === 'vehicle') ? 'vehicle_sale' : 'store_sale',
      locationId: selectedLocationId,
      customerId: selectedCustomerId || undefined,
      salesRepId: '', // سيتم تحديده تلقائياً في الخادم
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
      paymentType,
    };

    const result = await submitInvoiceAction(invoiceData);

    if (result.success) {
      setMessage({ type: 'success', text: `تم حفظ الفاتورة وخصم المخزون من: ${selectedLocationName}` });
      setCart([]);
      setBarcode('');
      setSelectedCustomerId('');
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل في حفظ الفاتورة' });
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* قسم رأس الصفحة */}
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">👤</div>
            <div>
              <p className="text-blue-100 text-sm">مندوب المبيعات</p>
              <p className="font-bold text-lg">{currentUserName}</p>
            </div>
          </div>
          <div className="text-center md:text-left bg-white/10 px-4 py-2 rounded-lg">
            <p className="text-blue-100 text-sm">تاريخ ووقت الفاتورة</p>
            <p className="font-bold text-lg font-mono">{currentTime}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* اختيار الموقع والعميل */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">📍 مصدر البيع (المخزن / السيارة)</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-800 font-medium"
                >
                  <option value="">-- اختر الموقع --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.type === 'vehicle' ? '🚚' : '🏪'} {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">👤 بيانات العميل</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-800"
                >
                  <option value="">عميل نقدي (عام)</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* نموذج الباركود */}
            <form onSubmit={handleBarcodeSubmit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="امسح الباركود هنا أو اكتبه واضغط Enter..."
                className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !barcode}
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
              >
                {isLoading ? 'جاري...' : 'إضافة'}
              </button>
            </form>

            {/* جدول سلة المشتريات */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-4">المنتج</th>
                      <th className="p-4">السعر</th>
                      <th className="p-4">الكمية</th>
                      <th className="p-4">الإجمالي</th>
                      <th className="p-4">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cart.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500">السلة فارغة. ابدأ بمسح الباركود.</td></tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium">{item.name}</td>
                          <td className="p-4">{item.unit_price.toFixed(2)} ر.س</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 font-bold text-gray-700 transition-colors">-</button>
                              <input type="number" min="1" value={item.quantity} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 1) updateQuantity(item.id, val); }} className="w-16 text-center border border-gray-300 rounded p-1 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 font-bold text-gray-700 transition-colors">+</button>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-blue-700">{item.total.toFixed(2)} ر.س</td>
                          <td className="p-4">
                            <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium transition-colors">حذف</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* القسم الأيسر: ملخص الفاتورة */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 text-center">🧾 ملخص الفاتورة</h2>
              
              <div className="bg-gray-50 p-4 rounded-md mb-4 space-y-2 text-sm border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">مصدر البيع:</span>
                  <span className="font-bold text-blue-700">{selectedLocationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">العميل:</span>
                  <span className="font-bold text-gray-800">{selectedCustomerName}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-600">الوقت:</span>
                  <span className="font-bold text-gray-800">{currentTime}</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>عدد الأصناف:</span>
                  <span>{cart.length}</span>
                </div>
                <div className="flex justify-between text-3xl font-bold text-gray-900 pt-3 border-t">
                  <span>الإجمالي:</span>
                  <span>{grandTotal.toFixed(2)} ر.س</span>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-md mb-4 text-sm font-medium ${
                  message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="space-y-3">
                <button onClick={() => handleCheckout('cash')} disabled={isLoading || cart.length === 0 || !selectedLocationId} className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors shadow-sm">
                  💵 دفع نقدي
                </button>
                <button onClick={() => handleCheckout('credit')} disabled={isLoading || cart.length === 0 || !selectedLocationId} className="w-full bg-orange-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors shadow-sm">
                  📝 دفع آجل (دين)
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}