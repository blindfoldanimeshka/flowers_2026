'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminNotifications from '../../components/AdminNotifications';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
      <header className="bg-[#FFB6B6] shadow-md fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="text-black mr-4 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link href="/admin" className="text-xl font-bold text-black">
              Админ-панель
            </Link>
          </div>
          <div className="flex items-center">
            <Link href="/" className="text-black hover:underline mr-4">
              На сайт
            </Link>
            <div className="bg-white text-black p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`bg-white fixed left-0 top-[56px] h-full shadow-md transition-all duration-300 z-10 ${isSidebarOpen ? 'w-[250px]' : 'w-0 -ml-10'}`}
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
      <main className={`pt-[76px] transition-all duration-300 ${isSidebarOpen ? 'ml-[250px]' : 'ml-0'}`}>
        <div className="p-6">
          {children}
        </div>
        <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover />
      </main>

      {/* Компонент уведомлений для администратора */}
      <AdminNotifications pollingInterval={30000} />
    </div>
  );
} 