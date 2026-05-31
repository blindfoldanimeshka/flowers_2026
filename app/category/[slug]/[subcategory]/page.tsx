import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { sanitizeForJsonLd } from '@/lib/seoSecurity';
import SubcategoryPage from '@/features/app/catalog/ui/SubcategoryPage';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; subcategory: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subcategory } = await params;

  // Validate slug format (alphanumeric, hyphens, underscores only)
  if (!/^[a-z0-9-_]+$/i.test(subcategory)) {
    return {
      title: 'Подкатегория не найдена',
    };
  }

  const { data: subcat, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('slug', subcategory)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !subcat) {
    return {
      title: 'Подкатегория не найдена',
    };
  }

  const safeName = sanitizeForJsonLd(subcat.name);

  return {
    title: safeName,
    description: `Купить ${safeName.toLowerCase()} с доставкой в Floramix. Широкий выбор свежих цветов и букетов. Гарантия качества и быстрая доставка.`,
    openGraph: {
      title: `${safeName} - Floramix`,
      description: `Купить ${safeName.toLowerCase()} с доставкой. Широкий выбор свежих цветов и букетов.`,
      type: 'website',
      url: `/category/${subcat.slug}`,
    },
  };
}

export default function Page() {
  return <SubcategoryPage />;
}
