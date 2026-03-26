'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HomeBanner() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4">
      <motion.div
        className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#ffe7ef] via-[#ffd8e8] to-[#ffecc8] px-6 py-8 sm:px-10 sm:py-12 shadow-sm"
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
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
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#catalog-section"
              className="rounded-full bg-[#2f1b26] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#20131a]"
            >
              Смотреть каталог
            </Link>
            <Link
              href="#categories-section"
              className="rounded-full border border-[#2f1b26]/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-[#2f1b26] transition-colors hover:bg-white"
            >
              Перейти к категориям
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

