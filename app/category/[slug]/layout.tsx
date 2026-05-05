import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { sanitizeForJsonLd } from '@/lib/seoSecurity';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Validate slug format (alphanumeric, hyphens, underscores only)
  if (!/^[a-z0-9-_]+$/i.test(slug)) {
    return {
      title: 'Категория не найдена',
    };
  }

  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !category) {
    return {
      title: 'Категория не найдена',
    };
  }

  // Sanitize category name
  const safeName = sanitizeForJsonLd(category.name);

  return {
    title: safeName,
    description: `Купить ${safeName.toLowerCase()} с доставкой в Floramix. Широкий выбор свежих цветов и букетов. Гарантия качества и быстрая доставка.`,
    openGraph: {
      title: `${safeName} - Floramix`,
      description: `Купить ${safeName.toLowerCase()} с доставкой. Широкий выбор свежих цветов и букетов.`,
      type: 'website',
      url: `/category/${slug}`,
    },
  };
}

export default async function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
