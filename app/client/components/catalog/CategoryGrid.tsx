'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCategoriesViewModel } from '@/features/app/catalog';

interface PublicSettings {
  homeCategoryCardBackgrounds?: Record<string, string>;
}

export default function CategoryGrid() {
  const { categories: rawCategories } = useCategoriesViewModel();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  // Сортируем категории по полю order (уже должны быть отсортированы с сервера, но на всякий случай)
  const categories = [...rawCategories].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

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

  const getDesktopSpanClass = (index: number) => {
    const indexInGroup = index % 5;
    return indexInGroup < 3 ? 'xl:col-span-2' : 'xl:col-span-3';
  };

  return (
    <section id="categories-section" className="w-full max-w-7xl mx-auto px-4">
      <motion.h2
        className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        Категории
      </motion.h2>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 auto-rows-fr gap-4 sm:gap-5 lg:gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {categories.map((category, index) => (
          <motion.div
            key={category._id || category.id}
            className={`min-h-[170px] sm:min-h-[210px] md:min-h-[220px] lg:min-h-[210px] xl:min-h-[190px] ${getDesktopSpanClass(index)}`}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 140,
              delay: index * 0.04,
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
          >
            <Link href={`/category/${category.slug}`} className="group block h-full">
              <div className="relative h-full w-full rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#FFE9E9] shadow-md hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                  {(() => {
                    const imageSrc =
                      settings?.homeCategoryCardBackgrounds?.[String(category._id)] ||
                      settings?.homeCategoryCardBackgrounds?.[category.slug] ||
                      category.image ||
                      '';

                    if (!imageSrc) {
                      return <div className="h-full w-full bg-gradient-to-br from-[#ffdbe8] to-[#ffeef4]" />;
                    }

                    return (
                      <Image
                        src={imageSrc}
                        alt={category.name}
                        fill
                        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 25vw, 33vw"
                        priority={index < 4}
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    );
                  })()}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/15 to-transparent" />

                <div className="relative h-full flex flex-col justify-between p-4 sm:p-5">
                  <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight pr-4">{category.name}</h3>

                  <div className="hidden lg:flex flex-wrap gap-2 max-w-[90%]">
                    {category.subcategories?.slice(0, 3).map((subcategory, idx) => (
                      <span
                        key={subcategory._id || `subcat-${idx}`}
                        className="px-2.5 py-1 bg-white/80 rounded-full text-xs text-[#2f1b26]"
                      >
                        {subcategory.name}
                      </span>
                    ))}
                  </div>

                  <div className="opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    <span className="inline-block px-3 py-1.5 bg-white text-[#2f1b26] rounded-full text-sm font-semibold">
                      Смотреть
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
