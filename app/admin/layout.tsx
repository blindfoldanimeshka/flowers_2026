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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 1024) {
      document.body.style.overflow = '';
      return;
    }

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }

    document.body.style.overflow = '';
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const navItems = [
    { label: 'Заказы', path: '/admin/orders' },
    { label: 'Товары', path: '/admin/products' },
    { label: 'Категории', path: '/admin/categories' },
    { label: 'Настройки магазина', path: '/admin/settings' },
    { label: 'Профиль', path: '/admin/profile' },
  ];

  return (
    <div className="min-h-[100dvh] bg-gray-100">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-40 h-14 bg-[#FFB6B6] shadow-md sm:h-16">
        <div className="flex h-full items-center justify-between px-3 sm:px-4">
          <div className="flex min-w-0 items-center">
            <button 
              onClick={toggleSidebar}
              className="mr-3 rounded-md p-1 text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 lg:hidden"
              aria-label={isSidebarOpen ? 'Закрыть меню' : 'Открыть меню'}
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
        className={`fixed left-0 top-14 z-40 h-[calc(100dvh-3.5rem)] w-64 bg-white shadow-md transition-transform duration-300 sm:top-16 sm:h-[calc(100dvh-4rem)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="mt-4 h-full overflow-y-auto pb-6">
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
      <main className="pt-14 transition-all duration-300 sm:pt-16 lg:ml-64">
        <div className="p-3 sm:p-5">
          {children}
        </div>
      </main>

      {/* Компонент уведомлений для администратора */}
      <AdminNotifications pollingInterval={30000} />
    </div>
  );
} 
