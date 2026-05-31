import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: 'Floramix — Доставка цветов и букетов в Красноярске',
  },
  description: 'Floramix - интернет-магазин цветов с доставкой в Красноярске. Широкий выбор свежих букетов, композиций и цветочных подарков. Быстрая доставка, гарантия качества.',
  openGraph: {
    title: 'Floramix - Доставка цветов и букетов',
    description: 'Широкий выбор свежих букетов, композиций и цветочных подарков. Быстрая доставка, гарантия качества.',
    type: 'website',
  },
};

import HomePage from '@/features/app/catalog/ui/HomePage';

export default HomePage;
