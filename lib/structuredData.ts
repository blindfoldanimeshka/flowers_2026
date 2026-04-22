import { sanitizeForJsonLd, sanitizePrice, sanitizeImageUrl } from './seoSecurity';

export function generateOrganizationSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://floramix24.ru';

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Floramix',
    url: baseUrl,
    logo: `${baseUrl}/image/logo.svg`,
    description: 'Интернет-магазин цветов с доставкой',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Russian',
    },
  };
}

export function generateProductSchema(product: {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  inStock: boolean;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://floramix24.ru';

  // Sanitize all user inputs
  const safeName = sanitizeForJsonLd(product.name);
  const safeDescription = sanitizeForJsonLd(product.description);
  const safePrice = sanitizePrice(product.price);
  const safeId = sanitizeForJsonLd(product._id);

  // Sanitize images
  const safeImages = product.images && product.images.length > 0
    ? product.images.map(img => sanitizeImageUrl(img, baseUrl))
    : [sanitizeImageUrl(product.image, baseUrl)];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: safeName,
    description: safeDescription,
    image: safeImages,
    offers: {
      '@type': 'Offer',
      price: safePrice,
      priceCurrency: 'RUB',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${baseUrl}/product/${safeId}`,
    },
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://floramix24.ru';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: sanitizeForJsonLd(item.name),
      item: `${baseUrl}${sanitizeForJsonLd(item.url)}`,
    })),
  };
}

export function generateWebSiteSchema() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://floramix24.ru';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Floramix',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
