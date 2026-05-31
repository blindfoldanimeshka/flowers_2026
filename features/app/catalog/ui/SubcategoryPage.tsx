'use client';

import { useParams, notFound } from 'next/navigation';
import Catalog from '@/app/client/components/catalog/Catalog';
import { useSubcategoryPageViewModel } from '@/features/app/catalog';
import { generateBreadcrumbSchema } from '@/lib/structuredData';

export default function SubcategoryPage() {
  const params = useParams();
  const subcategorySlug = typeof params.subcategory === 'string' ? params.subcategory : undefined;
  const { subcategory, loading } = useSubcategoryPageViewModel(subcategorySlug);

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center p-10">Загрузка...</div>;
  if (!subcategory) return notFound();

  const parentSlug = typeof params.slug === 'string' ? params.slug : '';

  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: 'Главная', url: '/' },
    { name: subcategory.name, url: `/category/${parentSlug}/${subcategory.slug}` },
  ]);

  return (
    <div className="pt-[calc(var(--mobile-top-offset)+32px)] md:pt-[var(--tablet-top-offset)] lg:pt-[var(--desktop-top-offset)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsSchema) }}
      />
      <div className="max-w-screen-xl mx-auto px-4 pb-12">
        <Catalog title={`Товары в подкатегории: ${subcategory.name}`} subcategoryId={subcategory._id} />
      </div>
    </div>
  );
}
