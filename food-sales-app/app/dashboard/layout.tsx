// app/dashboard/layout.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logoutAction } from '../actions/authActions';
import Link from 'next/link';

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return user;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  // 🆕 تمت إضافة رابط "التقارير المالية" هنا
  const menuItems = [
    { name: 'لوحة التحكم الرئيسية', href: '/dashboard', icon: '🏠' },
    { name: 'إدارة الأصناف والمنتجات', href: '/dashboard/products', icon: '📦' }, // <--- الإضافة الجديدة
    { name: 'نقطة البيع (المحل)', href: '/pos', icon: '🖥️' },
    { name: 'تطبيق المندوب (موبايل)', href: '/mobile-rep', icon: '🚚' },
    { name: 'سند القبض (التحصيل)', href: '/dashboard/collections', icon: '💰' },
    { name: 'تحويل المخزون', href: '/dashboard/stock-transfer', icon: '🔄' },
    { name: 'التقارير المالية', href: '/dashboard/reports', icon: '📈' },
    { name: 'إدارة العملاء', href: '/dashboard/customers', icon: '👥' },
    { name: 'المخازن والسيارات', href: '/dashboard/locations', icon: '🏢' },
    { name: 'المستخدمين والصلاحيات', href: '/dashboard/users', icon: '👤' },
  ];
  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* القائمة الجانبية (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl fixed h-full right-0 top-0 z-50">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-blue-400">نظام المبيعات</h2>
          <p className="text-xs text-slate-400 mt-1 truncate" title={user.email || ''}>
            {user.email}
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white hover:translate-x-1 duration-200"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <form action={logoutAction}>
            <button className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition-colors font-medium">
              <span>🚪</span> تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      {/* المحتوى الرئيسي (مع إضافة هامش يمين ليتناسب مع القائمة الثابتة) */}
      <main className="flex-1 mr-64 p-8 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}