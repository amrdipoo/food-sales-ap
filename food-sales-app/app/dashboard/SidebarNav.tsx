// app/dashboard/SidebarNav.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export default function SidebarNav({ 
  menuGroups, 
  userRole 
}: { 
  menuGroups: MenuGroup[];
  userRole: string | null;
}) {
  const pathname = usePathname();
  
  // ✅ حالة المجموعات المفتوحة (معرّف المجموعة → مفتوح/مغلق)
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // ✅ تحميل الحالة المحفوظة من localStorage عند أول تحميل
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_open_groups');
      if (saved) {
        setOpenGroups(JSON.parse(saved));
      } else {
        // افتراضياً: فتح جميع المجموعات
        const initial: Record<number, boolean> = {};
        menuGroups.forEach((_, idx) => { initial[idx] = true; });
        setOpenGroups(initial);
      }
    } catch (e) {
      const initial: Record<number, boolean> = {};
      menuGroups.forEach((_, idx) => { initial[idx] = true; });
      setOpenGroups(initial);
    }
    setIsLoaded(true);
  }, []);

  // ✅ حفظ الحالة في localStorage عند التغيير
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('sidebar_open_groups', JSON.stringify(openGroups));
      } catch (e) {}
    }
  }, [openGroups, isLoaded]);

  // دالة تبديل حالة المجموعة
  const toggleGroup = (idx: number) => {
    setOpenGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // فتح جميع المجموعات
  const expandAll = () => {
    const all: Record<number, boolean> = {};
    menuGroups.forEach((_, idx) => { all[idx] = true; });
    setOpenGroups(all);
  };

  // طي جميع المجموعات
  const collapseAll = () => {
    setOpenGroups({});
  };

  return (
    <>
      {/* أزرار التحكم العلوية */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-100">
        <button
          onClick={expandAll}
          className="flex-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 py-1.5 rounded transition-colors"
          title="فتح جميع المجموعات"
        >
          ⊞ فتح الكل
        </button>
        <button
          onClick={collapseAll}
          className="flex-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 py-1.5 rounded transition-colors"
          title="طي جميع المجموعات"
        >
          ⊟ طي الكل
        </button>
      </div>

      {/* قائمة المجموعات */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-2">
        {menuGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter(item => 
            userRole && item.roles.includes(userRole)
          );

          if (visibleItems.length === 0) return null;

          const isOpen = openGroups[groupIdx] !== false; // افتراضياً مفتوح

          return (
            <div key={groupIdx} className="rounded-lg overflow-hidden">
              {/* رأس المجموعة - قابل للنقر */}
              <button
                onClick={() => toggleGroup(groupIdx)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-100 transition-colors group/header"
              >
                <span className="text-base">{group.icon}</span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider flex-1 text-right">
                  {group.title}
                </span>
                {/* السهم المتحرك */}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${
                    isOpen ? 'rotate-90' : 'rotate-0'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* عناصر المجموعة - تنسدل بشكل انسيابي */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-0.5 pr-2 pt-1 pb-1 border-r-2 border-blue-100 mr-3">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <span className={`text-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
                          {item.icon}
                        </span>
                        <span className="font-medium text-sm">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
    </>
  );
}