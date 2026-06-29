// app/dashboard/locations/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { addLocationAction, toggleLocationStatusAction } from '../../actions/locationActions';

export const dynamic = 'force-dynamic';

interface Location {
  id: string;
  name: string;
  type: 'store' | 'vehicle';
  assigned_rep_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ تحميل البيانات مع منع التخزين المؤقت
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [locationsRes, usersRes] = await Promise.all([
        fetch('/api/locations', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
        fetch('/api/users', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
      ]);

      // ✅ التحقق من استجابة المواقع
      if (!locationsRes.ok) {
        const errorData = await locationsRes.json();
        throw new Error(errorData.error || 'فشل جلب المواقع');
      }
      const locationsData = await locationsRes.json();
      setLocations(locationsData || []);

      // ✅ التحقق من استجابة المستخدمين
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData || []);
      } else {
        console.warn('⚠️ فشل جلب المستخدمين');
        setUsers([]);
      }
    } catch (err: any) {
      console.error('❌ خطأ في تحميل البيانات:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddLocation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await addLocationAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم إضافة الموقع بنجاح' });
      await loadData(); // تحديث البيانات
      e.currentTarget.reset();
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل إضافة الموقع' });
    }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (locationId: string, currentStatus: boolean) => {
    const result = await toggleLocationStatusAction(locationId, currentStatus);
    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم تغيير حالة الموقع' });
      await loadData();
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل تغيير حالة الموقع' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">حدث خطأ</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">📍 إدارة المواقع</h1>
          <p className="text-blue-100 mt-1">إدارة المخازن والسيارات</p>
          <p className="text-blue-200 text-sm mt-2">عدد المواقع: {locations.length}</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🏢</span> إضافة موقع جديد
          </h2>
          <form onSubmit={handleAddLocation} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              name="name"
              required
              placeholder="اسم الموقع *"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              name="type"
              required
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="store">🏪 مخزن</option>
              <option value="vehicle">🚚 سيارة</option>
            </select>
            <select
              name="assigned_rep_id"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- بدون مندوب --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isSubmitting ? '⏳ جاري...' : '💾 حفظ الموقع'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4">الاسم</th>
                  <th className="p-4">النوع</th>
                  <th className="p-4">المندوب</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">تاريخ الإضافة</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {locations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      لا توجد مواقع حتى الآن.
                    </td>
                  </tr>
                ) : (
                  locations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">{location.name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${location.type === 'store' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {location.type === 'store' ? '🏪 مخزن' : '🚚 سيارة'}
                        </span>
                      </td>
                      <td className="p-4">
                        {location.assigned_rep_id ? users.find(u => u.id === location.assigned_rep_id)?.full_name || 'غير معروف' : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${location.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {location.is_active ? '✅ نشط' : '❌ غير نشط'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(location.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleStatus(location.id, location.is_active)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          {location.is_active ? 'تعطيل' : 'تفعيل'}
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