"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { withCsrfHeaders } from '@/lib/csrf-client';
import ImageUpload from '@/app/admin/components/ImageUpload';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label }) => {
  const [hour, minute] = value ? value.split(':') : ['09', '00'];

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || (val.length <= 2 && parseInt(val) >= 0 && parseInt(val) <= 23)) {
      onChange(`${val}:${minute}`);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || (val.length <= 2 && parseInt(val) >= 0 && parseInt(val) <= 59)) {
      onChange(`${hour}:${val}`);
    }
  };

  const handleHourBlur = () => {
    const currentHour = hour === '' || hour === '0' ? '00' : hour;
    const num = Math.min(23, Math.max(0, parseInt(currentHour) || 0));
    onChange(`${num.toString().padStart(2, '0')}:${minute}`);
  };

  const handleMinuteBlur = () => {
    const currentMinute = minute === '' || minute === '0' ? '00' : minute;
    const num = Math.min(59, Math.max(0, parseInt(currentMinute) || 0));
    onChange(`${hour}:${num.toString().padStart(2, '0')}`);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-1 text-xs text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input type="text" value={hour} onChange={handleHourChange} onBlur={handleHourBlur} className="w-12 rounded border bg-white px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="00" maxLength={2} />
        <span className="text-gray-500">:</span>
        <input type="text" value={minute} onChange={handleMinuteChange} onBlur={handleMinuteBlur} className="w-12 rounded border bg-white px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-blue-200" placeholder="00" maxLength={2} />
      </div>
    </div>
  );
};

interface TimeRangePickerProps {
  value: string;
  onChange: (timeRange: string) => void;
}

const TimeRangePicker: React.FC<TimeRangePickerProps> = ({ value, onChange }) => {
  const [startTime, endTime] = value && value.includes('-') ? value.split('-') : ['09:00', '21:00'];

  return (
    <div className="flex flex-wrap items-end gap-3 sm:gap-4">
      <TimePicker value={startTime} onChange={(newStartTime) => onChange(`${newStartTime}-${endTime}`)} label="Открытие" />
      <div className="pb-2 text-gray-400">-</div>
      <TimePicker value={endTime} onChange={(newEndTime) => onChange(`${startTime}-${newEndTime}`)} label="Закрытие" />
    </div>
  );
};

const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/[^\d+]/g, '');
  if (!numbers) return '';

  let formatted = '+7';
  const digits = numbers.replace(/^\+?7?/, '').slice(0, 10);

  if (digits.length >= 1) formatted += ' (' + digits.slice(0, 3);
  if (digits.length >= 4) formatted += ') ' + digits.slice(3, 6);
  if (digits.length >= 7) formatted += '-' + digits.slice(6, 8);
  if (digits.length >= 9) formatted += '-' + digits.slice(8, 10);

  return formatted;
};

const getInitialFormState = (settings: any) => ({
  address: settings?.address ?? '',
  contactPhone: settings?.contactPhone ?? '',
  contactPhone2: settings?.contactPhone2 ?? '',
  contactPhone3: settings?.contactPhone3 ?? '',
  pickupHours: settings?.pickupHours ?? '09:00-20:00',
  deliveryHours: settings?.deliveryHours ?? '09:00-02:00',
  deliveryInfo: settings?.deliveryInfo ?? '',
  instagram: settings?.socialLinks?.instagram ?? '',
  vk: settings?.socialLinks?.vk ?? '',
  telegram: settings?.socialLinks?.telegram ?? '',
  whatsapp: settings?.socialLinks?.whatsapp ?? '',
  homeCategoryCardBackgrounds: settings?.homeCategoryCardBackgrounds ?? {},
  homeBannerBackground: settings?.homeBannerBackground ?? '',
  homeBannerSlides: Array.isArray(settings?.homeBannerSlides) ? settings.homeBannerSlides.slice(0, 6) : [],
  tgId: Array.isArray(settings?.tgId) ? settings.tgId : [],
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

const sectionItems = [
  { key: 'contacts', label: 'Контакты' },
  { key: 'hours', label: 'График' },
  { key: 'visuals', label: 'Витрина' },
  { key: 'socials', label: 'Соцсети' },
  { key: 'notifications', label: 'Уведомления' },
] as const;

type SectionKey = typeof sectionItems[number]['key'];

export default function SettingsForm({ initialSettings }: { initialSettings: any }) {
  const [form, setForm] = useState(getInitialFormState(initialSettings));
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('contacts');
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
              .map((item: any) => ({ _id: String(item._id), slug: String(item.slug), name: String(item.name) }))
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
    const formattedValue = (name === 'contactPhone' || name === 'contactPhone2' || name === 'contactPhone3' || name === 'whatsapp')
      ? formatPhoneNumber(value)
      : value;
    setForm((f) => ({ ...f, [name]: formattedValue }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    const dataToSend = {
      address: form.address,
      contactPhone: form.contactPhone,
      contactPhone2: form.contactPhone2,
      contactPhone3: form.contactPhone3,
      pickupHours: form.pickupHours,
      deliveryHours: form.deliveryHours,
      deliveryInfo: form.deliveryInfo,
      socialLinks: {
        instagram: form.instagram,
        vk: form.vk,
        telegram: form.telegram,
        whatsapp: form.whatsapp,
      },
      homeCategoryCardBackgrounds: form.homeCategoryCardBackgrounds,
      homeBannerBackground: form.homeBannerBackground,
      homeBannerSlides: normalizeSlides(form.homeBannerSlides),
      tgId: form.tgId,
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
      toast.success('Настройки успешно сохранены!', { toastId: 'settings-save-success', autoClose: 3000 });
      router.refresh();
    } catch (err: any) {
      toast.dismiss('settings-save-error');
      toast.error(err.message, { toastId: 'settings-save-error', autoClose: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:p-6 lg:p-8">
      <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">Настройки магазина</h2>
      <p className="mb-5 text-sm text-gray-500">Переключай разделы, чтобы редактировать нужный блок без длинного скролла.</p>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {sectionItems.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveSection(section.key)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              activeSection === section.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-20">
        {activeSection === 'contacts' && (
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <label className="mb-1 block font-medium text-gray-700">Адрес магазина</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="г. Москва, ул. Примерная, д. 1" required />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Телефон 1</label>
              <input type="text" name="contactPhone" value={form.contactPhone} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="+7 (902) 990-76-49" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-gray-700">Телефон 2</label>
                <input type="text" name="contactPhone2" value={form.contactPhone2} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="+7 (902) 990-30-73" />
              </div>
              <div>
                <label className="mb-1 block font-medium text-gray-700">Телефон 3</label>
                <input type="text" name="contactPhone3" value={form.contactPhone3} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="+7 (391) 299-83-56" />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'hours' && (
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <label className="mb-3 block font-medium text-gray-700">Время работы самовывоза</label>
              <div className="rounded-lg border bg-white p-3 sm:p-4">
                <TimeRangePicker value={form.pickupHours} onChange={(timeRange) => setForm((f) => ({ ...f, pickupHours: timeRange }))} />
                <p className="mt-2 text-xs text-gray-500">Текущее время: <span className="font-medium">{form.pickupHours}</span></p>
              </div>
            </div>
            <div>
              <label className="mb-3 block font-medium text-gray-700">Время работы доставки</label>
              <div className="rounded-lg border bg-white p-3 sm:p-4">
                <TimeRangePicker value={form.deliveryHours} onChange={(timeRange) => setForm((f) => ({ ...f, deliveryHours: timeRange }))} />
                <p className="mt-2 text-xs text-gray-500">Текущее время: <span className="font-medium">{form.deliveryHours}</span></p>
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Информация о доставке</label>
              <input type="text" name="deliveryInfo" value={form.deliveryInfo} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="От 2500₽ - Центральный, ЖД район бесплатно" />
            </div>
          </div>
        )}

        {activeSection === 'visuals' && (
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <label className="mb-3 block font-medium text-gray-700">Фоны карточек категорий</label>
              {categoriesLoading ? (
                <div className="text-sm text-gray-500">Загрузка категорий...</div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-gray-500">Добавь категории, затем загрузи изображения для карточек.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {categories.map((category) => {
                    const value = form.homeCategoryCardBackgrounds?.[category._id] || form.homeCategoryCardBackgrounds?.[category.slug] || '';
                    return (
                      <div key={category._id} className="rounded-lg border bg-white p-3">
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
              <label className="mb-2 block font-medium text-gray-700">Фон баннера</label>
              <ImageUpload value={form.homeBannerBackground} onChange={(url) => setForm((f) => ({ ...f, homeBannerBackground: url }))} />
            </div>

            <div>
              <label className="mb-2 block font-medium text-gray-700">Слайды баннера (до 6)</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-lg border bg-white p-3">
                    <div className="mb-2 text-sm font-medium text-gray-700">Слайд {index + 1}</div>
                    <ImageUpload
                      value={form.homeBannerSlides[index] || ''}
                      onChange={(url) =>
                        setForm((f) => {
                          const nextSlides = normalizeSlides(f.homeBannerSlides);
                          while (nextSlides.length < 6) nextSlides.push('');
                          nextSlides[index] = url;
                          return { ...f, homeBannerSlides: nextSlides.filter(Boolean) };
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'socials' && (
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <label className="mb-1 block font-medium text-gray-700">WhatsApp</label>
              <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="+7 (999) 123-45-67" />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Instagram</label>
              <input type="url" name="instagram" value={form.instagram} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://instagram.com/username" />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">ВКонтакте</label>
              <input type="url" name="vk" value={form.vk} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://vk.com/username" />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700">Telegram</label>
              <input type="url" name="telegram" value={form.telegram} onChange={handleChange} className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://t.me/username" />
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div>
              <label className="mb-2 block font-medium text-gray-700">Telegram ID для уведомлений о заказах</label>
              <p className="mb-3 text-sm text-gray-500">
                Добавьте до 3 Telegram ID пользователей, которые будут получать уведомления о новых заказах.
                Чтобы узнать свой ID, напишите боту команду /start
              </p>
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <label className="mb-1 block text-sm text-gray-600">Telegram ID {index + 1}</label>
                    <input
                      type="text"
                      value={form.tgId[index] || ''}
                      onChange={(e) => {
                        const value = e.target.value.trim();
                        const numValue = value ? parseInt(value, 10) : null;
                        setForm((f) => {
                          const newTgId = [...f.tgId];
                          if (numValue && numValue > 0 && numValue <= 32767) {
                            newTgId[index] = numValue;
                          } else if (!value) {
                            newTgId[index] = null as any;
                          }
                          return { ...f, tgId: newTgId.filter((id) => id !== null && id !== undefined) };
                        });
                      }}
                      className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Например: 123456789"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6">
          <button type="submit" disabled={isLoading} className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto">
            {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>
    </div>
  );
}
