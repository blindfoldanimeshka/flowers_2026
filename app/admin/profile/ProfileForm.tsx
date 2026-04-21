"use client";
import React, { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { withCsrfHeaders } from '@/lib/csrf-client';

export default function ProfileForm() {
  const [form, setForm] = useState({ telegram_id: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsFetching(true);
        const response = await fetch('/api/auth/profile', { cache: 'no-store' });
        if (!response.ok) throw new Error('Не удалось загрузить профиль');
        const data = await response.json();
        setForm({ telegram_id: data.telegram_id || '' });
      } catch (err: any) {
        toast.error(err.message || 'Ошибка загрузки профиля');
      } finally {
        setIsFetching(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ telegram_id: form.telegram_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось сохранить профиль');
      }

      toast.dismiss('profile-save-success');
      toast.success("Профиль успешно обновлен!", {
        toastId: 'profile-save-success',
        autoClose: 3000,
      });

    } catch (err: any) {
      toast.dismiss('profile-save-error');
      toast.error(err.message, {
        toastId: 'profile-save-error',
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:p-6 lg:p-8">
        <div className="text-center text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:p-6 lg:p-8">
      <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-gray-800 sm:mb-8 sm:text-3xl">Профиль администратора</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Telegram ID</label>
          <input
            type="text"
            name="telegram_id"
            value={form.telegram_id}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="123456789"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ваш Telegram ID для получения уведомлений о новых заказах. Узнать свой ID можно у бота @userinfobot
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Сохранение...
            </div>
          ) : (
            'Сохранить'
          )}
        </button>
      </form>
    </div>
  );
}
