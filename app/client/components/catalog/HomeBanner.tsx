'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HomeBanner() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4">
      <motion.div
        className="relative overflow-hidden rounded-[28px] bg-[#ffe7ef] px-6 py-8 sm:px-10 sm:py-12 shadow-sm min-h-[260px] sm:min-h-[300px] md:min-h-[340px]"
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* Фото как фон баннера (адаптивная обрезка за счет object-cover) */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/image/bannerpicture.png"
            alt="Баннер"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1200px"
            className="object-cover object-[70%_50%]"
          />
          {/* Затемнение/градиент для читаемости текста */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#ffffff]/80 via-[#ffffff]/55 to-[#fff3d4]/70" />
        </div>

        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/35 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#fff3d4]/70 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex rounded-full bg-white/55 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8c3f56]">
            FloraMix Collection
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-[#2f1b26] sm:text-4xl md:text-5xl">
            Цветы для любого повода
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#5f4150] sm:text-base">
            Свежие букеты, композиции и подарочные наборы с быстрой доставкой в день заказа.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

