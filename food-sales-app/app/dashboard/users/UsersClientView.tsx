// app/dashboard/users/UsersClientView.tsx
'use client';

import { useState } from 'react';
import {
  addUserAction,
  updateUserAction,
  deleteUserAction,
  toggleUserStatusAction,
} from '../../actions/userActions';

interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'store_manager' | 'sales_rep';
  is_active: boolean;
  created_at: string;
}

interface UsersClientViewProps {
  users: User[];
  successMessage?: string | null;
  updatedMessage?: string | null;
  deletedMessage?: string | null;
}

export default function UsersClientView({
  users: initialUsers,
  successMessage,
  updatedMessage,
  deletedMessage,
}: UsersClientViewProps) {
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            👑 مدير النظام
          </span>
        );
      case 'store_manager':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
            🏢 مدير مخزن
          </span>
        );
      case 'sales_rep':
        return (
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
            🚚 مندوب مبيعات
          </span>
        );
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{role}</span>;
    }
  };

  // ✅ دالة معالجة إضافة مستخدم
  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await addUserAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message || '✅ تم إضافة المستخدم بنجاح' });
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل إضافة المستخدم' });
    }
    setIsSubmitting(false);
  };

  // ✅ دالة معالجة تحديث مستخدم
  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateUserAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message || '✅ تم تحديث المستخدم بنجاح' });
      setEditingUser(null);
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل تحديث المستخدم' });
    }
    setIsSubmitting(false);
  };

  // ✅ دالة معالجة تبديل حالة المستخدم
  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setIsSubmitting(true);
    setMessage(null);

    const result = await toggleUserStatusAction(userId, currentStatus);

    if (result.success) {
      setMessage({ type: 'success', text: '✅ تم تغيير حالة المستخدم بنجاح' });
      // تحديث الحالة محلياً
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, is_active: !currentStatus } : user
        )
      );
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل تغيير حالة المستخدم' });
    }
    setIsSubmitting(false);
  };

  // ✅ دالة معالجة حذف مستخدم
  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف المستخدم "${userName}"؟\n\nلا يمكن التراجع عن هذا الإجراء!`)) return;

    setIsSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('userId', userId);
    const result = await deleteUserAction(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'تم حذف المستخدم بنجاح' });
      setUsers(prev => prev.filter(user => user.id !== userId));
    } else {
      setMessage({ type: 'error', text: result.error || '❌ فشل الحذف' });
    }
    setIsSubmitting(false);
  };

  const activeMessage = successMessage || updatedMessage || deletedMessage || message?.text;

  return (
    <div className="space-y-8 p-6" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-800">👥 إدارة المستخدمين والصلاحيات</h1>

      {activeMessage && (
        <div
          className={`p-4 rounded-lg font-medium animate-in fade-in slide-in-from-top duration-300 ${
            message?.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
        >
          {activeMessage}
        </div>
      )}

      {/* نموذج إضافة مستخدم جديد */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span className="text-2xl">➕</span> إضافة مستخدم جديد
        </h2>

        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            name="full_name"
            required
            placeholder="الاسم الكامل"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="البريد الإلكتروني"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="phone"
            placeholder="رقم الجوال"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            name="password"
            type="password"
            placeholder="كلمة المرور (6 أحرف على الأقل)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <select
            name="role"
            required
            className="p-3 border border-gray-300 rounded-lg bg-white md:col-span-2 lg:col-span-3 focus:ring-2 focus:ring-blue-500"
          >
            <option value="sales_rep">🚚 مندوب مبيعات</option>
            <option value="store_manager">🏢 مدير مخزن</option>
            <option value="admin">👑 مدير النظام</option>
          </select>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors lg:col-span-1"
          >
            {isSubmitting ? '⏳ جاري...' : '💾 حفظ المستخدم'}
          </button>
        </form>
      </div>

      {/* جدول المستخدمين */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">الاسم / البريد</th>
                <th className="p-4">الجوال</th>
                <th className="p-4">الدور</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    لا يوجد مستخدمون مسجلون.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{user.full_name}</div>
                      <div className="text-xs text-gray-500 mt-1" dir="ltr">
                        {user.email}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600" dir="ltr">
                      {user.phone || '-'}
                    </td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">
                      {/* ✅ استخدام onClick بدلاً من form مع action */}
                      <button
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        disabled={isSubmitting}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          user.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        } disabled:opacity-50`}
                      >
                        {user.is_active ? '✓ نشط' : '✗ معطل'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-sm font-medium px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.full_name)}
                          className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        >
                          🗑️ حذف
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

      {/* نافذة التعديل المنبثقة (Modal) */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">✏️ تعديل بيانات المستخدم</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <input type="hidden" name="id" value={editingUser.id} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الاسم الكامل *</label>
                <input
                  name="full_name"
                  defaultValue={editingUser.full_name}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني *</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الجوال</label>
                <input
                  name="phone"
                  defaultValue={editingUser.phone || ''}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الدور (الصلاحية)</label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sales_rep">🚚 مندوب مبيعات</option>
                  <option value="store_manager">🏢 مدير مخزن</option>
                  <option value="admin">👑 مدير النظام</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔐 تغيير كلمة المرور (اختياري)
                </label>
                <input
                  name="new_password"
                  type="password"
                  minLength={6}
                  placeholder="اتركها فارغة إذا لم ترد التغيير"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">6 أحرف على الأقل. اتركها فارغة للإبقاء على كلمة المرور الحالية.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isSubmitting ? '⏳ جاري...' : '💾 حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}