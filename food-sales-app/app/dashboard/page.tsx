// app/dashboard/page.tsx
import { getUserRole } from '../actions/authActions';
import { getRepTrackingData } from '../actions/trackingActions';
import MapWrapper from './MapWrapper';
import { getActiveCustomers } from '../actions/collectionActions';
import { getCollectionsList } from '../actions/collectionActions';
import { getFinancialReports } from '../actions/reportActions';
import { getActiveLocations } from '../actions/posActions';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [role, trackingData, customers, collections, reports, locations] = await Promise.all([
    getUserRole(),
    getRepTrackingData(),
    getActiveCustomers(),
    getCollectionsList(),
    getFinancialReports({}),
    getActiveLocations(),
  ]);

  const totalCustomers = customers?.length || 0;
  const totalCollections = collections?.length || 0;
  const totalAmount = collections?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;
  const totalInvoices = reports?.invoices?.length || 0;
  const totalSales = reports?.summary?.totalSales || 0;
  const totalPaid = reports?.summary?.totalPaid || 0;
  const totalLocations = locations?.length || 0;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-blue-100 text-sm mt-1">
          مرحباً بك في نظام إدارة المبيعات
          {role && <span className="mr-2 font-semibold">| الدور: {role}</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">العملاء</p>
            <p className="text-2xl font-bold text-gray-800">{totalCustomers}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">👥</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">سندات القبض</p>
            <p className="text-2xl font-bold text-gray-800">{totalCollections}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">💰</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">إجمالي التحصيل</p>
            <p className="text-2xl font-bold text-green-600">{totalAmount.toFixed(2)} ج.م</p> {/* ✅ جنيه مصري */}
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">📊</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">الفواتير</p>
            <p className="text-2xl font-bold text-gray-800">{totalInvoices}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">📄</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/pos" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
          <div className="text-3xl mb-2">🛒</div>
          <span className="block text-sm font-medium text-gray-700">نقطة البيع</span>
        </Link>
        <Link href="/dashboard/collections" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
          <div className="text-3xl mb-2">📋</div>
          <span className="block text-sm font-medium text-gray-700">سند قبض</span>
        </Link>
        <Link href="/dashboard/invoices" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
          <div className="text-3xl mb-2">📄</div>
          <span className="block text-sm font-medium text-gray-700">الفواتير</span>
        </Link>
        <Link href="/dashboard/products" className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center">
          <div className="text-3xl mb-2">📦</div>
          <span className="block text-sm font-medium text-gray-700">المنتجات</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">إجمالي المبيعات</p>
          <p className="text-2xl font-bold text-blue-600">{totalSales.toFixed(2)} ج.م</p> {/* ✅ */}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">إجمالي المدفوعات</p>
          <p className="text-2xl font-bold text-green-600">{totalPaid.toFixed(2)} ج.م</p> {/* ✅ */}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">المواقع النشطة</p>
          <p className="text-2xl font-bold text-purple-600">{totalLocations}</p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-3">📍 تتبع المندوبين</h2>
        <MapWrapper points={trackingData} />
      </div>
    </div>
  );
}