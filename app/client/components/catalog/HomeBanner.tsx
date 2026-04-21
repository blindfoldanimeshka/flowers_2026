'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

interface PublicSettings {
  homeBannerBackground?: string;
  homeBannerSlides?: string[];
}

const FALLBACK_SLIDE = '/image/bannerpicture.png';

export default function HomeBanner() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (!response.ok) return;

        const data = (await response.json()) as { settings?: PublicSettings };
        if (isMounted) {
          setSettings(data.settings || null);
        }
      } catch {
        if (isMounted) {
          setSettings(null);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const slides = useMemo(() => {
    const fromSettings = (settings?.homeBannerSlides || [])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);

    return fromSettings.length > 0 ? fromSettings : [FALLBACK_SLIDE];
  }, [settings?.homeBannerSlides]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timerId = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timerId);
  }, [slides]);

  useEffect(() => {
    if (slideIndex >= slides.length) {
      setSlideIndex(0);
    }
  }, [slideIndex, slides.length]);

  const backgroundStyle = settings?.homeBannerBackground
    ? ({
        backgroundImage: `url('${settings.homeBannerBackground}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } as const)
    : undefined;

  return (
    <section className="w-full max-w-7xl mx-auto px-4">
      <motion.div
        className="relative overflow-hidden rounded-[28px] bg-[#ffe7ef] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 shadow-sm min-h-[250px] sm:min-h-[290px] md:min-h-[clamp(280px,40dvh,360px)] lg:min-h-[340px]"
        style={backgroundStyle}
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={slides[slideIndex]}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeInOut' }}
            >
              <Image
                src={slides[slideIndex] || FALLBACK_SLIDE}
                alt="Баннер"
                fill
                priority
                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 92vw, 1200px"
                className="object-cover object-[70%_50%]"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-[#ffffff]/70 via-[#ffffff]/40 to-transparent" />
        </div>

        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#fff3d4]/50 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex rounded-full bg-white/45 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8c3f56]">
            FloraMix Collection
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-[#2f1b26] [text-shadow:0_1px_0_rgba(255,255,255,0.4)] sm:text-4xl md:text-[clamp(2.2rem,4.8vw,3rem)] xl:text-5xl">
            Цветы для любого повода
          </h1>
          <p className="mt-3 inline-block max-w-2xl rounded-xl bg-white/42 px-3 py-2 text-sm font-medium leading-relaxed text-[#4f3641] backdrop-blur-[2px] sm:text-base">
            Свежие букеты, композиции и подарочные наборы с быстрой доставкой в день заказа.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
