'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { label: 'Дашборд', path: '/admin/dashboard' },
    { label: 'Заказы', path: '/admin/orders' },
    { label: 'Товары', path: '/admin/products' },
    { label: 'Категории', path: '/admin/categories' },
    { label: 'Настройки', path: '/admin/settings' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-md">
      <div className="p-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Админ-панель</h2>
      </div>
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`block px-4 py-2 text-sm ${
                  pathname === item.path
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 