'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { productionLogger } from '@/lib/productionLogger'

type SocialLinks = {
  telegram?: string;
  vk?: string;
  instagram?: string;
  whatsapp?: string;
};

type PublicSettings = {
  contactPhone?: string;
  contactPhone2?: string;
  contactPhone3?: string;
  workingHours?: string;
  pickupHours?: string;
  deliveryHours?: string;
  deliveryInfo?: string;
  socialLinks?: SocialLinks;
};

export default function SocialButton({ settings }: { settings?: PublicSettings }) {
  const [isOpen, setIsOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState<PublicSettings | undefined>(settings)

  // Fetch settings from the API if none were passed in
  useEffect(() => {
    if (!settings) {
      (async () => {
        try {
          const res = await fetch('/api/settings', { cache: 'no-store' });
          if (!res.ok) throw new Error('Failed to fetch settings');
          const data = (await res.json()) as { settings?: PublicSettings };
          setLocalSettings(data.settings);
        } catch (err) {
          productionLogger.error('Unable to load settings for SocialButton:', err);
        }
      })();
    }
  }, [settings]);

  const currentSettings = localSettings ?? settings;
  const socialLinks = currentSettings?.socialLinks || {}

  const toggleOpen = () => setIsOpen((prev) => !prev)

  const formatLink = (base: string, value?: string) => {
    if (!value) return undefined;
    if (value.startsWith('http')) return value;
    const username = value.split('/').pop();
    return `${base}${username}`;
  };

  const formatWhatsAppLink = (phone?: string) => {
    if (!phone) return undefined;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly ? `https://wa.me/${digitsOnly}` : undefined;
  };

  const phones = [
    currentSettings?.contactPhone,
    currentSettings?.contactPhone2,
    currentSettings?.contactPhone3,
  ].filter(Boolean) as string[];

  const scheduleParts: string[] = [];
  if (currentSettings?.pickupHours) {
    scheduleParts.push(`Самовывоз: ${currentSettings.pickupHours}`);
  }
  if (currentSettings?.deliveryHours) {
    const delivery = currentSettings.deliveryInfo
      ? `Доставка: ${currentSettings.deliveryHours} (${currentSettings.deliveryInfo})`
      : `Доставка: ${currentSettings.deliveryHours}`;
    scheduleParts.push(delivery);
  }
  const scheduleText = scheduleParts.length > 0 ? scheduleParts.join(', ') : (currentSettings?.workingHours || '');

  const socialButtons = [
    {
      name: 'Telegram',
      icon: '/icons/telegram.svg',
      href: formatLink('https://t.me/', socialLinks.telegram) as string | undefined,
      style: 'bg-blue-400',
    },
    {
      name: 'VK',
      icon: '/icons/VK.svg',
      href: formatLink('https://vk.com/', socialLinks.vk) as string | undefined,
      style: 'bg-blue-600',
    },
    {
      name: 'Instagram',
      icon: '/icons/instagram.svg',
      href: formatLink('https://instagram.com/', socialLinks.instagram) as string | undefined,
      style: 'bg-pink-500',
    },
    {
      name: 'WhatsApp',
      icon: '/icons/whatsapp.svg',
      href: formatWhatsAppLink(socialLinks.whatsapp) as string | undefined,
      style: 'bg-green-500 text-white',
    },
  ].filter((button) => button.href);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            className="fixed z-[70] w-[min(92vw,380px)] rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl"
            style={{ bottom: "calc(92px + var(--safe-area-bottom))", right: "calc(16px + var(--safe-area-right))" }}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">Контакты</h3>
                <p className="text-xs text-neutral-500">Быстрая связь с магазином</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Закрыть контакты"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {phones.length > 0 && (
              <div className="mb-3 space-y-2">
                {phones.map((phone, index) => (
                  <a
                    key={`${phone}-${index}`}
                    href={`tel:${phone.replace(/\D/g, '')}`}
                    className="block rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-900 transition hover:border-pink-300 hover:bg-pink-50"
                  >
                    Позвонить: {phone}
                  </a>
                ))}
              </div>
            )}

            {socialButtons.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {socialButtons.map((button) => (
                  <Link
                    key={button.name}
                    href={button.href || ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium shadow-sm transition hover:scale-[1.02] ${button.style}`}
                  >
                    <Image src={button.icon} alt={button.name} width={18} height={18} />
                    <span>{button.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {scheduleText && (
              <p className="rounded-xl bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-700">
                {scheduleText}
              </p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.div
        className="fixed z-[80]"
        style={{ bottom: "var(--float-offset-bottom)", right: "calc(16px + var(--safe-area-right))" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35, delay: 0.25, type: "spring" }}
      >
        <motion.button
          onClick={toggleOpen}
          type="button"
          className="inline-flex h-14 items-center gap-2 rounded-full bg-pink-500 px-4 text-white shadow-xl transition hover:bg-pink-600"
          aria-label="Открыть контакты"
          animate={
            isOpen
              ? { scale: 1, boxShadow: '0 10px 22px rgba(236, 72, 153, 0.35)' }
              : {
                  scale: [1, 1.03, 1],
                  boxShadow: [
                    '0 8px 18px rgba(236, 72, 153, 0.28)',
                    '0 12px 26px rgba(236, 72, 153, 0.42)',
                    '0 8px 18px rgba(236, 72, 153, 0.28)',
                  ],
                }
          }
          transition={isOpen ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.45-1.25a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="text-sm font-semibold">Контакты</span>
        </motion.button>
      </motion.div>
    </>
  )
}

