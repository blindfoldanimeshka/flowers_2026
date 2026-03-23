'use client';

import { useParams, notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import Catalog from '@/app/client/components/catalog/Catalog';
import { useCategoryPageViewModel } from '@/features/app/catalog';

export default function CategoryPage() {
  const { slug } = useParams();
  const { category, loading } = useCategoryPageViewModel(typeof slug === 'string' ? slug : undefined);

  if (loading) {
    return <motion.div className="flex justify-center p-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>Загрузка...</motion.div>;
  }

  if (!category) return notFound();

  return (
    <motion.div className="mt-40" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="max-w-screen-xl mx-auto px-4 pb-12">
        <Catalog title={`Все товары в категории ${category.name}`} categoryId={category._id} />
      </div>
    </motion.div>
  );
}

