'use client';

import { useParams, notFound } from 'next/navigation';
import Catalog from '@/app/client/components/catalog/Catalog';
import { useCategoryPageViewModel } from '@/features/app/catalog';

export default function CategoryPage() {
  const { slug } = useParams();
  const { category, loading } = useCategoryPageViewModel(typeof slug === 'string' ? slug : undefined);

  if (loading) {
    return <div className="flex min-h-[45vh] items-center justify-center p-10">Загрузка...</div>;
  }

  if (!category) return notFound();

  return (
    <div className="pt-[calc(var(--mobile-top-offset)+32px)] md:pt-[var(--tablet-top-offset)] lg:pt-[var(--desktop-top-offset)]">
      <div className="max-w-screen-xl mx-auto px-4 pb-12">
        <Catalog title={`Все товары в категории ${category.name}`} categoryId={category._id} />
      </div>
    </div>
  );
}
