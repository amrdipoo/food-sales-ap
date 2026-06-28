// app/login/page.tsx
'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { registerUserAction } from '../actions/userActions';
import { saveRepTracking } from '../actions/trackingActions';

export const dynamic = 'force-dynamic';
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message.includes('Invalid login credentials') ? 'البيانات غير صحيحة' : authError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const userRole = userData?.role?.toLowerCase().trim();

        // 🆕 تتبع الموقع عند تسجيل الدخول مع رسائل واضحة
        console.log('🟢 بدء تتبع موقع الدخول...');
        
        if (!navigator.geolocation) {
          console.warn('⚠️ المتصفح لا يدعم GPS');
        } else {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              console.log('✅ تم الحصول على الموقع:', position.coords);
              const result = await saveRepTracking(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy,
                'login'
              );
              console.log('📤 نتيجة الحفظ:', result);
              if (result.success) {
                console.log('✅ تم حفظ موقع الدخول بنجاح');
              } else {
                console.error('❌ فشل حفظ موقع الدخول:', result.error);
              }
            },
            (error) => {
              console.error('❌ فشل الحصول على الموقع:', error.message);
              console.error('كود الخطأ:', error.code);
              // لا نوقف التطبيق حتى لو فشل التتبع
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }

        // التوجيه بناءً على الدور
        if (userRole === 'sales_rep') {
          window.location.href = '/pos';
        } else {
          window.location.href = '/dashboard';
        }
      }
      
    } catch (err: any) {
      setError('حدث خطأ غير متوقع: ' + err.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterMessage(null);
    const formData = new FormData(e.currentTarget);
    const result = await registerUserAction(formData);
    if (result.success) {
      setRegisterMessage({ type: 'success', text: 'تم التسجيل بنجاح!' });
      setTimeout(() => { setShowRegisterModal(false); setEmail(formData.get('email') as string); }, 2000);
    } else {
      setRegisterMessage({ type: 'error', text: result.error || 'فشل التسجيل' });
    }
    setRegisterLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🚚</div>
          <h1 className="text-2xl font-bold text-gray-800">نظام إدارة المبيعات</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="البريد الإلكتروني" className="w-full p-3 border rounded-lg" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="كلمة المرور" className="w-full p-3 border rounded-lg" />
          
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">⚠️ {error}</div>}
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setShowRegisterModal(true)} className="text-blue-600 font-bold hover:underline">
            ✨ إنشاء حساب جديد
          </button>
        </div>
      </div>

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <h2 className="text-2xl font-bold mb-4">إنشاء حساب جديد</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <input name="full_name" required placeholder="الاسم" className="w-full p-3 border rounded-lg" />
              <input name="email" type="email" required placeholder="البريد" className="w-full p-3 border rounded-lg" />
              <input name="password" type="password" required placeholder="كلمة المرور" className="w-full p-3 border rounded-lg" />
              {registerMessage && <div className={`p-3 rounded ${registerMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{registerMessage.text}</div>}
              <button type="submit" disabled={registerLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg">{registerLoading ? '...' : 'تسجيل'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}