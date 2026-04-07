"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { withCsrfHeaders } from '@/lib/csrf-client';
import ImageUpload from '@/app/admin/components/ImageUpload';

// Компонент для выбора времени
interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label }) => {
  // Парсим значение из пропсов без локального состояния
  const [hour, minute] = value ? value.split(':') : ['09', '00'];

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Только цифры
    
    // Не форматируем сразу, позволяем пользователю ввести значение
    if (val === '' || (val.length <= 2 && parseInt(val) >= 0 && parseInt(val) <= 23)) {
      onChange(`${val}:${minute}`);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // Только цифры
    
    // Не форматируем сразу, позволяем пользователю ввести значение
    if (val === '' || (val.length <= 2 && parseInt(val) >= 0 && parseInt(val) <= 59)) {
      onChange(`${hour}:${val}`);
    }
  };

  const handleHourBlur = () => {
    const currentHour = hour === '' || hour === '0' ? '00' : hour;
    const num = Math.min(23, Math.max(0, parseInt(currentHour) || 0));
    const formattedHour = num.toString().padStart(2, '0');
    onChange(`${formattedHour}:${minute}`);
  };

  const handleMinuteBlur = () => {
    const currentMinute = minute === '' || minute === '0' ? '00' : minute;
    const num = Math.min(59, Math.max(0, parseInt(currentMinute) || 0));
    const formattedMinute = num.toString().padStart(2, '0');
    onChange(`${hour}:${formattedMinute}`);
  };

  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={hour}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          className="w-12 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-200 outline-none bg-white text-sm text-center"
          placeholder="00"
          maxLength={2}
        />
        <span className="text-gray-500">:</span>
        <input
          type="text"
          value={minute}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          className="w-12 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-200 outline-none bg-white text-sm text-center"
          placeholder="00"
          maxLength={2}
        />
      </div>
    </div>
  );
};

// Компонент для выбора диапазона времени
interface TimeRangePickerProps {
  value: string;
  onChange: (timeRange: string) => void;
}

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ value, onChange }) => {
  // Парсим значение из пропсов без локального состояния
  const [startTime, endTime] = value && value.includes('-') 
    ? value.split('-') 
    : ['09:00', '21:00'];

  const handleStartTimeChange = (newStartTime: string) => {
    onChange(`${newStartTime}-${endTime}`);
  };

  const handleEndTimeChange = (newEndTime: string) => {
    onChange(`${startTime}-${newEndTime}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 sm:gap-4">
      <TimePicker
        value={startTime}
        onChange={handleStartTimeChange}
        label="Открытие"
      />
      <div className="pb-2">
        <span className="text-gray-400 text-lg">—</span>
      </div>
      <TimePicker
        value={endTime}
        onChange={handleEndTimeChange}
        label="Закрытие"
      />
    </div>
  );
};

// Функция форматирования российского номера телефона
const formatPhoneNumber = (value: string): string => {
  // Убираем все нецифровые символы кроме +
  const numbers = value.replace(/[^\d+]/g, '');
  
  // Если строка пустая, возвращаем пустую строку
  if (!numbers) return '';
  
  // Начинаем с +7
  let formatted = '+7';
  
  // Берем только цифры после +7
  const digits = numbers.replace(/^\+?7?/, '').slice(0, 10);
  
  if (digits.length >= 1) {
    formatted += ' (' + digits.slice(0, 3);
  }
  if (digits.length >= 4) {
    formatted += ') ' + digits.slice(3, 6);
  }
  if (digits.length >= 7) {
    formatted += '-' + digits.slice(6, 8);
  }
  if (digits.length >= 9) {
    formatted += '-' + digits.slice(8, 10);
  }
  
  return formatted;
};

// Гарантирует, что все поля формы имеют определенное значение (хотя бы пустую строку)
const getInitialFormState = (settings: any) => ({
  address: settings?.address ?? '',
  contactPhone: settings?.contactPhone ?? '',
  workingHours: settings?.workingHours ?? '09:00-21:00',
  instagram: settings?.socialLinks?.instagram ?? '',
  vk: settings?.socialLinks?.vk ?? '',
  telegram: settings?.socialLinks?.telegram ?? '',
  whatsapp: settings?.socialLinks?.whatsapp ?? '',
  homeCategoryCardBackgrounds: settings?.homeCategoryCardBackgrounds ?? {},
  homeBannerBackground: settings?.homeBannerBackground ?? '',
  homeBannerSlides: Array.isArray(settings?.homeBannerSlides) ? settings.homeBannerSlides.slice(0, 6) : [],
});

interface CategoryItem {
  _id: string;
  slug: string;
  name: string;
}

function normalizeSlides(slides: unknown): string[] {
  return Array.isArray(slides)
    ? slides.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 6)
    : [];
}

export default function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [form, setForm] = useState(getInitialFormState(initialSettings));
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setForm(getInitialFormState(initialSettings));
  }, [initialSettings]);

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const response = await fetch('/api/categories', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        if (isMounted) {
          setCategories(
            list
              .filter((item: any) => item && item._id && item.slug && item.name)
              .slice(0, 10)
              .map((item: any) => ({
                _id: String(item._id),
                slug: String(item.slug),
                name: String(item.name),
              }))
          );
        }
      } catch {
        if (isMounted) setCategories([]);
      } finally {
        if (isMounted) setCategoriesLoading(false);
      }
    };

    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Форматирование для полей телефонов
    if (name === 'contactPhone' || name === 'whatsapp') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setForm(f => ({ ...f, [name]: formattedValue }));
  };

  const handleTimeRangeChange = (timeRange: string) => {
    setForm(f => ({ ...f, workingHours: timeRange }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    // Собираем данные для отправки, включая вложенный объект socialLinks
    const dataToSend = {
      address: form.address,
      contactPhone: form.contactPhone,
      workingHours: form.workingHours,
      socialLinks: {
        instagram: form.instagram,
        vk: form.vk,
        telegram: form.telegram,
        whatsapp: form.whatsapp,
      },
      homeCategoryCardBackgrounds: form.homeCategoryCardBackgrounds,
      homeBannerBackground: form.homeBannerBackground,
      homeBannerSlides: normalizeSlides(form.homeBannerSlides),
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось сохранить настройки');
      }
      toast.dismiss('settings-save-success');
      toast.success("Настройки успешно сохранены!", {
        toastId: 'settings-save-success',
        autoClose: 3000,
      });
      router.refresh();

    } catch (err: any) {
      toast.dismiss('settings-save-error');
      toast.error(err.message, {
        toastId: 'settings-save-error',
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:p-6 lg:p-8">
      <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-gray-800 sm:mb-8 sm:text-3xl">Настройки магазина</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Адрес магазина</label>
          <input
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="г. Москва, ул. Примерная, д. 1"
            required
          />
        </div>
        
        <div>
          <label className="block mb-1 font-medium text-gray-700">Телефон</label>
          <input
            type="text"
            name="contactPhone"
            value={form.contactPhone}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="+7 (999) 123-45-67"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Формат: +7 (xxx) xxx-xx-xx</p>
        </div>
        
        <div>
          <label className="block mb-3 font-medium text-gray-700">Часы работы</label>
          <div className="rounded-lg border bg-gray-50 p-3 sm:p-4">
            <TimeRangePicker
              value={form.workingHours}
              onChange={handleTimeRangeChange}
            />
            <p className="text-xs text-gray-500 mt-2">
              Текущее время: <span className="font-medium">{form.workingHours}</span>
            </p>
          </div>
        </div>
        
        <div>
          <label className="block mb-3 font-medium text-gray-700">
            Фоны карточек категорий (до 10, только для существующих категорий)
          </label>
          {categoriesLoading ? (
            <div className="text-sm text-gray-500">Загрузка категорий...</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-gray-500">
              Категории пока не добавлены. Поля загрузки фото появятся автоматически после создания категорий.
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => {
                const value =
                  form.homeCategoryCardBackgrounds?.[category._id] ||
                  form.homeCategoryCardBackgrounds?.[category.slug] ||
                  '';
                return (
                  <div key={category._id} className="rounded-lg border bg-gray-50 p-3">
                    <div className="mb-2 text-sm font-medium text-gray-700">{category.name}</div>
                    <ImageUpload
                      value={value}
                      onChange={(url) =>
                        setForm((f) => ({
                          ...f,
                          homeCategoryCardBackgrounds: {
                            ...(f.homeCategoryCardBackgrounds || {}),
                            [category._id]: url,
                            [category.slug]: url,
                          },
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">Фон баннера (загрузка файла)</label>
          <ImageUpload
            value={form.homeBannerBackground}
            onChange={(url) => setForm((f) => ({ ...f, homeBannerBackground: url }))}
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-gray-700">Слайды баннера (до 6 файлов)</label>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-lg border bg-gray-50 p-3">
                <div className="mb-2 text-sm font-medium text-gray-700">Слайд {index + 1}</div>
                <ImageUpload
                  value={form.homeBannerSlides[index] || ''}
                  onChange={(url) =>
                    setForm((f) => {
                      const nextSlides = normalizeSlides(f.homeBannerSlides);
                      while (nextSlides.length < 6) nextSlides.push('');
                      nextSlides[index] = url;
                      return {
                        ...f,
                        homeBannerSlides: nextSlides.filter(Boolean),
                      };
                    })
                  }
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Слайды автоматически переключаются на сайте каждые 6 секунд с плавным fade.</p>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">WhatsApp</label>
          <input
            type="text"
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="+7 (999) 123-45-67"
          />
          <p className="text-xs text-gray-500 mt-1">Формат: +7 (xxx) xxx-xx-xx</p>
        </div>
        
        <div>
          <label className="block mb-1 font-medium text-gray-700">Instagram</label>
          <input
            type="url"
            name="instagram"
            value={form.instagram}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="https://instagram.com/username"
          />
          <p className="text-xs text-gray-500 mt-1">Ссылка на профиль Instagram</p>
        </div>
        
        <div>
          <label className="block mb-1 font-medium text-gray-700">ВКонтакте</label>
          <input
            type="url"
            name="vk"
            value={form.vk}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="https://vk.com/username"
          />
          <p className="text-xs text-gray-500 mt-1">Ссылка на страницу ВКонтакте</p>
        </div>
        
        <div>
          <label className="block mb-1 font-medium text-gray-700">Telegram</label>
          <input
            type="url"
            name="telegram"
            value={form.telegram}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-blue-200 outline-none"
            placeholder="https://t.me/username"
          />
          <p className="text-xs text-gray-500 mt-1">Ссылка на канал/чат Telegram</p>
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
