'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminNotifications from '../../components/AdminNotifications';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 1024px)');
    const syncSidebarState = () => setIsSidebarOpen(media.matches);
    syncSidebarState();
    media.addEventListener('change', syncSidebarState);
    return () => media.removeEventListener('change', syncSidebarState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navItems = [
    { label: 'Заказы', path: '/admin/orders' },
    { label: 'Товары', path: '/admin/products' },
    { label: 'Категории', path: '/admin/categories' },
    { label: 'Настройки магазина', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#FFB6B6] shadow-md fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center">
            <button 
              onClick={toggleSidebar}
              className="text-black mr-3 rounded-md p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
              aria-label="Открыть меню"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link href="/admin" className="truncate text-base font-bold text-black sm:text-xl">
              Админ-панель
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="text-sm text-black hover:underline sm:text-base">
              На сайт
            </Link>
            <div className="bg-white text-black p-2 rounded-full hidden sm:block">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-20 bg-black/35 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`bg-white fixed left-0 top-[56px] h-[calc(100vh-56px)] shadow-md transition-transform duration-300 z-30 w-[250px] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="mt-6 overflow-hidden">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  className={`flex items-center py-3 px-6 hover:bg-[#FFDADA] ${pathname === item.path ? 'bg-[#FFDADA] font-semibold' : ''}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pt-[72px] transition-all duration-300 lg:ml-[250px]">
        <div className="p-3 sm:p-6">
          {children}
        </div>
      </main>

      {/* Компонент уведомлений для администратора */}
      <AdminNotifications pollingInterval={30000} />
    </div>
  );
} 
