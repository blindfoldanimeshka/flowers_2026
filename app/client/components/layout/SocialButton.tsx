'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function SocialButton({ settings }: { settings?: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)

  // Fetch settings from the API if none were passed in
  useEffect(() => {
    if (!settings) {
      (async () => {
        try {
          const res = await fetch('/api/settings', { cache: 'no-store' });
          if (!res.ok) throw new Error('Failed to fetch settings');
          const data = await res.json();
          setLocalSettings(data.settings);
        } catch (err) {
          console.error('Unable to load settings for SocialButton:', err);
        }
      })();
    }
  }, [settings]);
  
  const socialLinks = (localSettings ?? settings)?.socialLinks || {}

  const toggleOpen = () => setIsOpen(!isOpen)

  const formatLink = (base: string, value: string) => {
    if (!value) return undefined;
    if (value.startsWith('http')) return value;
    const username = value.split('/').pop();
    return `${base}${username}`;
  };

  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return undefined;
    const digitsOnly = phone.replace(/\D/g, '');
    return `https://wa.me/${digitsOnly}`;
  };

  const mainButtonStyle = isOpen
    ? 'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 overflow-hidden bg-white'
    : 'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 overflow-hidden animate-pulse bg-pink-500'

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
      style: 'bg-green-500',
    },
  ]

  return (
    <motion.div 
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 0.5, type: "spring" }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="flex flex-col items-end mb-4 space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {socialButtons
              .filter(button => button.href)
              .map((button, index) => (
                <motion.div
                  key={button.name}
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: 20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    type: "spring",
                    damping: 15
                  }}
                >
                  <Link
                    href={button.href || ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transform transition-all duration-300 hover:scale-110 ${button.style}`}
                  >
                    <Image src={button.icon} alt={button.name} width={28} height={28} />
                  </Link>
                </motion.div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleOpen}
        className={mainButtonStyle}
        aria-label="Toggle Social Links"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="#ffffff">
            <path d="M478-240q21 0 35.5-14.5T528-290q0-21-14.5-35.5T478-340q-21 0-35.5 14.5T428-290q0 21 14.5 35.5T478-240Zm-36-154h74q0-33 7.5-52t42.5-52q26-26 41-49.5t15-56.5q0-56-41-86t-97-30q-57 0-92.5 30T342-618l66 26q5-18 22.5-39t53.5-21q32 0 48 17.5t16 38.5q0 20-12 37.5T506-526q-44 39-54 59t-10 73Zm38 314q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
          </svg>
        )}
      </motion.button>
    </motion.div>
  )
} 