// app/dashboard/layout.tsx
import { getUserRole, UserRole, logoutAction } from '../actions/authActions';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import SidebarNav from './SidebarNav';

export const dynamic = 'force-dynamic';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  return userData;
}

// تعريف المجموعات
interface MenuItem {
  name: string;
  href: string;
  icon: string;
  roles: string[];
}

interface MenuGroup {
  title: string;
  icon: string;
  items: MenuItem[];
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userRole = await getUserRole();
  const currentUser = await getCurrentUser();

  const menuGroups: MenuGroup[] = [
    {
      title: 'الرئيسية',
      icon: '🏠',
      items: [
        { name: 'لوحة التحكم', href: '/dashboard', icon: '📊', roles: ['admin', 'store_manager', 'sales_rep'] },
      ]
    },
    {
      title: 'المبيعات',
      icon: '💰',
      items: [
        { name: 'نقطة البيع (POS)', href: '/pos', icon: '🖥️', roles: ['admin', 'store_manager', 'sales_rep'] },
        { name: 'تطبيق المندوب', href: '/mobile-rep', icon: '🚚', roles: ['admin', 'sales_rep'] },
        { name: 'إدارة الفواتير', href: '/dashboard/invoices', icon: '📄', roles: ['admin', 'store_manager'] },
        { name: 'سند القبض', href: '/dashboard/collections', icon: '💵', roles: ['admin', 'store_manager'] },
      ]
    },
    {
      title: 'المخازن والمنتجات',
      icon: '📦',
      items: [
        { name: 'إدارة المنتجات', href: '/dashboard/products', icon: '🏷️', roles: ['admin', 'store_manager'] },
        { name: 'المخازن والسيارات', href: '/dashboard/locations', icon: '🏢', roles: ['admin', 'store_manager'] },
        { name: 'تحويل المخزون', href: '/dashboard/stock-transfer', icon: '🔄', roles: ['admin', 'store_manager'] },
      ]
    },
    {
      title: 'التقارير',
      icon: '📈',
      items: [
        { name: 'التقارير المالية', href: '/dashboard/reports', icon: '💹', roles: ['admin', 'store_manager'] },
      ]
    },
    {
      title: 'الإدارة',
      icon: '⚙️',
      items: [
        { name: 'المستخدمين والصلاحيات', href: '/dashboard/users', icon: '👥', roles: ['admin'] },
      ]
    },
  ];

  const getRoleLabel = (role: UserRole | null) => {
    switch (role) {
      case 'admin': return '👑 مدير النظام';
      case 'store_manager': return '🏢 مدير مخزن';
      case 'sales_rep': return '🚚 مندوب مبيعات';
      default: return 'مستخدم';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      {/* الشريط الجانبي */}
      <aside className="w-72 bg-white shadow-lg flex flex-col border-l border-gray-200">
        {/* رأس الشريط الجانبي */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-l from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-2xl">
              🚚
            </div>
            <div>
              <div className="text-lg font-bold text-white">نظام المبيعات</div>
              <div className="text-xs text-blue-100">إدارة متكاملة</div>
            </div>
          </div>
        </div>

        {/* معلومات المستخدم الحالي */}
        {currentUser && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">
                {currentUser.full_name?.charAt(0) || '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {currentUser.full_name}
                </p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  {getRoleLabel(userRole)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 استخدام مكون Client الجديد */}
        <SidebarNav menuGroups={menuGroups} userRole={userRole} />

        {/* زر تسجيل الخروج */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium border border-red-100"
            >
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}