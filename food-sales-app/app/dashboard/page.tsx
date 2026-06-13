// app/dashboard/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getStats() {
  const cookieStore =  await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  );

  // جلب إجمالي المبيعات اليوم (مثال مبسط)
  const { count: invoicesCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });

  const { count: customersCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  return { invoicesCount: invoicesCount || 0, customersCount: customersCount || 0 };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { title: 'إجمالي الفواتير', value: stats.invoicesCount, icon: '🧾', color: 'bg-blue-500' },
    { title: 'عدد العملاء', value: stats.customersCount, icon: '👥', color: 'bg-green-500' },
    { title: 'المندوبين النشطين', value: '3', icon: '🚚', color: 'bg-orange-500' }, // قيمة تجريبية
    { title: 'تنبيهات المخزون', value: '0', icon: '⚠️', color: 'bg-red-500' }, // قيمة تجريبية
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">لوحة التحكم الرئيسية</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-14 h-14 ${card.color} rounded-full flex items-center justify-center text-2xl text-white shadow-md`}>
              {card.icon}
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
        <p className="text-lg">مرحباً بك في النظام. اختر أحد الأقسام من القائمة الجانبية للبدء.</p>
      </div>
    </div>
  );
}