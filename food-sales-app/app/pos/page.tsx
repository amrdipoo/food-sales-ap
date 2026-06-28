// app/pos/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { getProductByBarcode, Product } from '../../lib/services/productService';
import { getActiveCustomers, Customer } from '../../lib/services/customerService';
import { getActiveLocations } from '../actions/posActions';
import { submitInvoiceAction, getProductStockAction } from '../actions/invoiceActions';
import { getCurrentUserAction } from '../actions/userActions';
import { saveRepTracking } from '../actions/trackingActions';

interface CartItem extends Product {
  quantity: number;
  total: number;
  availableStock?: number;
}

interface LastInvoice {
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  locationName: string;
  repName: string;
  date: string;
  items: Array<{ name: string; quantity: number; unit_price: number; total: number }>;
  total: number;
  paid: number;
  remaining: number;
  paymentType: 'cash' | 'credit' | 'partial';
}

export default function POSPage() {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [locations, setLocations] = useState<{ id: string; name: string; type: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('جاري التحميل...');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cashAmount, setCashAmount] = useState<number>(0);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<LastInvoice | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const loadData = async () => {
      const [custData, locData, userData] = await Promise.all([
        getActiveCustomers(),
        getActiveLocations(),
        getCurrentUserAction(),
      ]);
      setCustomers(custData);
      setLocations(locData);
      if (userData) {
        setCurrentUserName(userData.full_name || userData.email || 'مستخدم');
      }
      if (locData.length > 0 && !selectedLocationId) {
        setSelectedLocationId(locData[0].id);
      }
    };
    loadData();

    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString('ar-EG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    if (!selectedLocationId) {
      setMessage({ type: 'error', text: '⚠️ يرجى اختيار المخزن أولاً!' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    const product = await getProductByBarcode(barcode);

    if (product) {
      const currentStock = await getProductStockAction(product.id, selectedLocationId);
      const existingItem = cart.find((item) => item.id === product.id);
      const requestedQty = (existingItem?.quantity || 0) + 1;

      if (currentStock === 0) {
        setMessage({ type: 'error', text: `⛔ "${product.name}" غير متوفر في المخزن المختار!` });
      } else if (requestedQty > currentStock) {
        setMessage({ type: 'warning', text: `⚠️ الرصيد المتاح من "${product.name}" هو ${currentStock} فقط.` });
      } else {
        setCart((prevCart) => {
          if (existingItem) {
            return prevCart.map((item) =>
              item.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                    total: (item.quantity + 1) * item.unit_price,
                    availableStock: currentStock,
                  }
                : item
            );
          }
          return [
            ...prevCart,
            { ...product, quantity: 1, total: product.unit_price, availableStock: currentStock },
          ];
        });
        setBarcode('');
      }
    } else {
      setMessage({ type: 'error', text: 'المنتج غير موجود أو الباركود غير صحيح' });
    }

    setIsLoading(false);
    setBarcode('');
    inputRef.current?.focus();
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const item = cart.find((i) => i.id === productId);
    if (item && item.availableStock !== undefined && newQuantity > item.availableStock) {
      setMessage({ type: 'warning', text: `⚠️ الرصيد المتاح من "${item.name}" هو ${item.availableStock} فقط.` });
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity, total: newQuantity * item.unit_price } : item
      )
    );
    setMessage(null);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerName = selectedCustomer?.name || 'عميل نقدي (عام)';
  const selectedCustomerPhone = selectedCustomer?.phone || '';
  const selectedLocationName = locations.find((l) => l.id === selectedLocationId)?.name || 'غير محدد';

  const openPaymentModal = (defaultCashAmount: number) => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'السلة فارغة!' });
      return;
    }
    if (!selectedLocationId) {
      setMessage({ type: 'error', text: 'يرجى اختيار المخزن أولاً!' });
      return;
    }
    setCashAmount(defaultCashAmount);
    setShowPaymentModal(true);
  };

  const saveLocationAfterInvoice = async () => {
    try {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation غير مدعوم');
        return { success: false, error: 'المتصفح لا يدعم تحديد الموقع' };
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      console.log('📍 تم جلب الموقع:', latitude, longitude, 'الدقة:', accuracy);

      const result = await saveRepTracking(latitude, longitude, accuracy, 'update');
      return result;
    } catch (err: any) {
      console.error('❌ خطأ في حفظ الموقع:', err);
      if (err.code === 1) {
        return { success: false, error: 'تم رفض الوصول إلى الموقع الجغرافي' };
      }
      return { success: false, error: err.message || 'خطأ في جلب الموقع' };
    }
  };

  const confirmPayment = async () => {
    setIsLoading(true);
    setMessage(null);
    setShowPaymentModal(false);

    const invoiceData = {
      type: locations.find((l) => l.id === selectedLocationId)?.type === 'vehicle' ? 'vehicle_sale' : 'store_sale',
      location_id: selectedLocationId,
      customer_id: selectedCustomerId || null,
      total_amount: grandTotal,
      paid_amount: cashAmount,
      discount: 0,
      items: cart.map((item) => ({
        product_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
    };

    const result = await submitInvoiceAction(invoiceData);

    if (result.success) {
      const remaining = Number(result.remaining || 0);
      let paymentType: 'cash' | 'credit' | 'partial' = 'cash';
      if (remaining === grandTotal) paymentType = 'credit';
      else if (remaining > 0) paymentType = 'partial';

      const invoiceInfo: LastInvoice = {
        invoiceNumber: result.invoiceNumber || 'غير معروف',
        customerName: selectedCustomerName,
        customerPhone: selectedCustomerPhone,
        locationName: selectedLocationName,
        repName: currentUserName,
        date: new Date().toLocaleString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        })),
        total: grandTotal,
        paid: cashAmount,
        remaining: remaining,
        paymentType: paymentType,
      };

      setLastInvoice(invoiceInfo);
      setShowPrintModal(true);

      const locationResult = await saveLocationAfterInvoice();
      if (locationResult.success) {
        setMessage({ type: 'success', text: `✅ تم حفظ الفاتورة والموقع بنجاح` });
      } else {
        console.warn('⚠️ فشل حفظ الموقع:', locationResult.error);
        setMessage({
          type: 'warning',
          text: `⚠️ تم حفظ الفاتورة لكن فشل حفظ الموقع (${locationResult.error})`,
        });
      }

      setCart([]);
      setBarcode('');
      setSelectedCustomerId('');
      setCashAmount(0);
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل في حفظ الفاتورة' });
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const getWhatsAppMessage = (invoice: LastInvoice): string => {
    const itemsText = invoice.items
      .map(
        (item, idx) =>
          `${idx + 1}- ${item.name} (${item.quantity} × ${item.unit_price.toFixed(2)} ج.م) = ${item.total.toFixed(2)} ج.م`
      )
      .join('\n');

    const paymentLabel =
      invoice.paymentType === 'cash' ? 'نقدي' : invoice.paymentType === 'credit' ? 'آجل' : 'جزئي';

    return `
🧾 *إيصال فاتورة*
رقم الفاتورة: ${invoice.invoiceNumber}
التاريخ: ${invoice.date}
العميل: ${invoice.customerName}
المندوب: ${invoice.repName}
المصدر: ${invoice.locationName}
نوع الدفع: ${paymentLabel}

*المنتجات:*
${itemsText}

*الإجمالي:* ${invoice.total.toFixed(2)} ج.م
*المدفوع:* ${invoice.paid.toFixed(2)} ج.م
${invoice.remaining > 0 ? `*المتبقي:* ${invoice.remaining.toFixed(2)} ج.م` : ''}

شكراً لتعاملكم معنا 🙏
`.trim();
  };

  const sendWhatsApp = () => {
    if (!lastInvoice) return;
    const message = getWhatsAppMessage(lastInvoice);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const sendWhatsAppToCustomer = () => {
    if (!lastInvoice) return;
    let phone = lastInvoice.customerPhone;
    if (!phone) {
      const userPhone = prompt('أدخل رقم هاتف العميل (مع مفتاح الدولة، مثال: 20xxxxxxxxxx):');
      if (!userPhone) return;
      phone = userPhone.replace(/\D/g, '');
    } else {
      phone = phone.replace(/\D/g, '');
    }
    const message = getWhatsAppMessage(lastInvoice);
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  };

  const printReceipt = () => {
    if (!lastInvoice) return;

    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) {
      alert('⚠️ يرجى السماح بفتح النوافذ المنبثقة للطباعة');
      return;
    }

    const paymentLabel =
      lastInvoice.paymentType === 'cash' ? 'نقدي' : lastInvoice.paymentType === 'credit' ? 'آجل' : 'جزئي';

    const itemsHTML = lastInvoice.items
      .map(
        (item, idx) => `
      <tr>
        <td style="padding:8px;border-bottom:1px dashed #ddd;text-align:center">${idx + 1}</td>
        <td style="padding:8px;border-bottom:1px dashed #ddd">${item.name}</td>
        <td style="padding:8px;border-bottom:1px dashed #ddd;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px dashed #ddd;text-align:left">${item.unit_price.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px dashed #ddd;text-align:left;font-weight:bold">${item.total.toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const receiptHTML = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>إيصال فاتورة - ${lastInvoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Arial', 'Tahoma', sans-serif; 
      padding: 20px; 
      max-width: 320px; 
      margin: 0 auto;
      color: #333;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px dashed #333; 
      padding-bottom: 15px; 
      margin-bottom: 15px; 
    }
    .header h1 { 
      font-size: 20px; 
      margin-bottom: 5px; 
      color: #1e40af;
    }
    .header p { font-size: 12px; color: #666; }
    .info { 
      margin-bottom: 15px; 
      font-size: 13px; 
      line-height: 1.8;
    }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 3px 0;
    }
    .info-row strong { color: #1e40af; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 15px 0; 
      font-size: 12px; 
    }
    thead { 
      background: #1e40af; 
      color: white; 
    }
    thead th { 
      padding: 8px; 
      text-align: center; 
    }
    .totals { 
      border-top: 2px dashed #333; 
      padding-top: 10px; 
      margin-top: 15px;
    }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 0; 
      font-size: 14px;
    }
    .total-row.final { 
      font-size: 18px; 
      font-weight: bold; 
      color: #1e40af;
      border-top: 1px solid #333;
      padding-top: 10px;
      margin-top: 5px;
    }
    .total-row.paid { color: #16a34a; }
    .total-row.remaining { color: #ea580c; }
    .footer { 
      text-align: center; 
      margin-top: 20px; 
      padding-top: 15px; 
      border-top: 2px dashed #333; 
      font-size: 11px; 
      color: #666;
    }
    .thank-you { 
      font-size: 14px; 
      font-weight: bold; 
      color: #1e40af; 
      margin-bottom: 5px;
    }
    .whatsapp-btn {
      display: inline-block;
      margin-top: 10px;
      padding: 8px 16px;
      background: #25D366;
      color: #fff;
      text-decoration: none;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
    }
    @media print {
      body { padding: 10px; }
      @page { margin: 10mm; size: 80mm auto; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧾 إيصال بيع</h1>
    <p>نظام المبيعات المتكامل</p>
  </div>

  <div class="info">
    <div class="info-row"><span>رقم الفاتورة:</span> <strong>${lastInvoice.invoiceNumber}</strong></div>
    <div class="info-row"><span>التاريخ:</span> <span>${lastInvoice.date}</span></div>
    <div class="info-row"><span>العميل:</span> <span>${lastInvoice.customerName}</span></div>
    <div class="info-row"><span>المندوب:</span> <span>${lastInvoice.repName}</span></div>
    <div class="info-row"><span>المصدر:</span> <span>${lastInvoice.locationName}</span></div>
    <div class="info-row"><span>نوع الدفع:</span> <strong>${paymentLabel}</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>المنتج</th>
        <th>الكمية</th>
        <th>السعر</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row final">
      <span>الإجمالي:</span>
      <span>${lastInvoice.total.toFixed(2)} ج.م</span>
    </div>
    <div class="total-row paid">
      <span>💵 المدفوع:</span>
      <span>${lastInvoice.paid.toFixed(2)} ج.م</span>
    </div>
    ${lastInvoice.remaining > 0 ? `
    <div class="total-row remaining">
      <span>📝 المتبقي (آجل):</span>
      <span>${lastInvoice.remaining.toFixed(2)} ج.م</span>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p class="thank-you">✨ شكراً لتعاملكم معنا ✨</p>
    <p>هذا الإيصال صادر من نظام المبيعات الإلكتروني</p>
    <p>تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
    setLastInvoice(null);
  };

  const creditAmount = grandTotal - cashAmount;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
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
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">📍 مصدر البيع</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  <option value="">عميل نقدي (عام)</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {isLoading ? 'جاري...' : 'إضافة'}
              </button>
            </form>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="p-4">المنتج</th>
                      <th className="p-4">السعر</th>
                      <th className="p-4">الكمية</th>
                      <th className="p-4">الإجمالي</th>
                      <th className="p-4">الرصيد</th>
                      <th className="p-4">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          السلة فارغة. ابدأ بمسح الباركود.
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium">{item.name}</td>
                          <td className="p-4">{item.unit_price.toFixed(2)} ج.م</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 1) updateQuantity(item.id, val);
                                }}
                                className="w-16 text-center border border-gray-300 rounded p-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.availableStock !== undefined && item.quantity >= item.availableStock}
                                className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-blue-700">{item.total.toFixed(2)} ج.م</td>
                          <td className="p-4">
                            {item.availableStock !== undefined ? (
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  item.availableStock === 0
                                    ? 'bg-red-100 text-red-700'
                                    : item.availableStock < 5
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {item.availableStock}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium"
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
                  <span>{grandTotal.toFixed(2)} ج.م</span>
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-md mb-4 text-sm font-medium whitespace-pre-line ${
                    message.type === 'success'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : message.type === 'warning'
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => openPaymentModal(grandTotal)}
                  disabled={isLoading || cart.length === 0 || !selectedLocationId}
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors shadow-sm"
                >
                  💵 دفع نقدي
                </button>
                <button
                  onClick={() => openPaymentModal(0)}
                  disabled={isLoading || cart.length === 0 || !selectedLocationId}
                  className="w-full bg-orange-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-600 disabled:bg-gray-400 transition-colors shadow-sm"
                >
                  📝 دفع آجل (دين)
                </button>
                <button
                  onClick={() => openPaymentModal(grandTotal / 2)}
                  disabled={isLoading || cart.length === 0 || !selectedLocationId}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 disabled:bg-gray-400 transition-colors shadow-sm"
                >
                  💰 دفع جزئي (نصف/نصف)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-2xl font-bold text-gray-800">💳 تأكيد الدفع</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-red-600 text-3xl leading-none">
                &times;
              </button>
            </div>

            <div className="bg-gradient-to-l from-blue-50 to-blue-100 p-4 rounded-lg mb-4 border border-blue-200">
              <p className="text-sm text-gray-600">إجمالي الفاتورة</p>
              <p className="text-3xl font-bold text-blue-700">
                {grandTotal.toFixed(2)} <span className="text-lg">ج.م</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">💵 المبلغ المدفوع نقداً</label>
              <input
                type="number"
                min="0"
                max={grandTotal}
                step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(Math.max(0, Math.min(grandTotal, Number(e.target.value) || 0)))}
                className="w-full p-4 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-2xl font-bold text-green-700 text-left"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setCashAmount(0)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium">
                  0
                </button>
                <button
                  onClick={() => setCashAmount(grandTotal * 0.25)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
                >
                  25%
                </button>
                <button
                  onClick={() => setCashAmount(grandTotal * 0.5)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
                >
                  50%
                </button>
                <button
                  onClick={() => setCashAmount(grandTotal * 0.75)}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
                >
                  75%
                </button>
                <button
                  onClick={() => setCashAmount(grandTotal)}
                  className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm font-bold"
                >
                  100%
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">💵 المدفوع نقداً:</span>
                <span className="font-bold text-green-700">{cashAmount.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">📝 المتبقي (آجل):</span>
                <span className="font-bold text-orange-700">{creditAmount.toFixed(2)} ج.م</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmPayment}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {isLoading ? '⏳ جاري الحفظ...' : '✅ تأكيد الدفع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && lastInvoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">✅ تم حفظ الفاتورة بنجاح!</h3>
              <p className="text-gray-600">رقم الفاتورة:</p>
              <p className="text-xl font-bold text-blue-700 font-mono mt-1">{lastInvoice.invoiceNumber}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">العميل:</span>
                <span className="font-bold">{lastInvoice.customerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">الإجمالي:</span>
                <span className="font-bold text-blue-700">{lastInvoice.total.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">💵 المدفوع:</span>
                <span className="font-bold text-green-700">{lastInvoice.paid.toFixed(2)} ج.م</span>
              </div>
              {lastInvoice.remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">📝 المتبقي:</span>
                  <span className="font-bold text-orange-700">{lastInvoice.remaining.toFixed(2)} ج.م</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={printReceipt}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-lg flex items-center justify-center gap-2"
              >
                🖨️ طباعة الإيصال
              </button>

              <button
                onClick={sendWhatsAppToCustomer}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md text-lg flex items-center justify-center gap-2"
              >
                💬 إرسال عبر واتساب
              </button>

              <button
                onClick={sendWhatsApp}
                className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-colors shadow-md text-lg flex items-center justify-center gap-2"
              >
                📱 فتح واتساب ويب (اختيار جهة اتصال)
              </button>

              <button
                onClick={closePrintModal}
                className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-colors text-lg"
              >
                ❌ إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}