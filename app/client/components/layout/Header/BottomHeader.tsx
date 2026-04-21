'use client';

import { useEffect, useState } from 'react';

interface Settings {
  address?: string;
  contactPhone?: string;
  contactPhone2?: string;
  contactPhone3?: string;
  workingHours?: string;
  pickupHours?: string;
  deliveryHours?: string;
  deliveryInfo?: string;
}

export default function BottomHeader() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setSettings(data.settings || null);
      } catch {
        setSettings(null);
      }
    };

    fetchSettings();
  }, []);

  const address = settings?.address || 'г. Москва, ул. Ленина, 1';
  const phones = [
    settings?.contactPhone,
    settings?.contactPhone2,
    settings?.contactPhone3
  ].filter(Boolean);
  const phoneDisplay = phones.length > 0 ? phones.join(', ') : '+7 (999) 999-99-99';

  // Формируем строку времени работы
  let hoursDisplay = '';
  if (settings?.pickupHours || settings?.deliveryHours) {
    const parts: string[] = [];
    if (settings.pickupHours) parts.push(`Самовывоз: ${settings.pickupHours}`);
    if (settings.deliveryHours) {
      let deliveryText = `Доставка: ${settings.deliveryHours}`;
      if (settings.deliveryInfo) deliveryText += ` (${settings.deliveryInfo})`;
      parts.push(deliveryText);
    }
    hoursDisplay = parts.join(', ');
  } else {
    hoursDisplay = settings?.workingHours || 'Самовывоз: 9-20, Доставка: 9-2 ночи';
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 p-2 sm:justify-around rounded-b-[30px] bg-[#F0D2D2] text-[13px] sm:text-[16px]">
      <h3 className="truncate max-w-full sm:max-w-none">Адрес: {address}</h3>
      <h3 className="truncate max-w-full sm:max-w-none">Телефон: {phoneDisplay}</h3>
      <h3 className="truncate max-w-full sm:max-w-none">Время работы: {hoursDisplay}</h3>
    </div>
  );
}
