'use client';

import React from 'react';
import { useLogoutViewModel } from '@/features/admin/auth';

export default function AdminHeader() {
  const { isLoggingOut, handleLogout } = useLogoutViewModel();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Админ-панель</h1>
      </div>
      <div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
        >
          {isLoggingOut ? 'Выход...' : 'Выйти'}
        </button>
      </div>
    </header>
  );
}
