'use client'

import CategoryGrid from "@/app/client/components/catalog/CategoryGrid";
import HomeBanner from "@/app/client/components/catalog/HomeBanner";
import { HomeCatalogSection } from '@/features/app/catalog';

export default function HomePage() {
  return (
    <div className="pt-[calc(var(--mobile-top-offset)+32px)] md:pt-[var(--tablet-top-offset)] lg:pt-[var(--desktop-top-offset)]">
      <div>
        <HomeBanner />
      </div>
      <div className="mt-10">
        <CategoryGrid />
      </div>
      <div className="mt-16" id="catalog-section">
        <HomeCatalogSection />
      </div>
    </div>
  );
}

