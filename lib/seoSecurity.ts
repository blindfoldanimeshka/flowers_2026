/**
 * Sanitize string to prevent XSS attacks in JSON-LD
 * Removes HTML tags and escapes special characters
 */
export function sanitizeForJsonLd(input: string): string {
  if (!input) return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .trim();
}

/**
 * Validate and sanitize URL to prevent open redirect
 */
export function sanitizeUrl(url: string, baseUrl: string): string {
  if (!url) return baseUrl;

  // Remove any protocol to prevent external redirects
  const cleanUrl = url.replace(/^(https?:)?\/\//i, '');

  // Ensure it starts with / for relative URLs
  if (!cleanUrl.startsWith('/')) {
    return `/${cleanUrl}`;
  }

  return cleanUrl;
}

/**
 * Validate price to prevent injection
 */
export function sanitizePrice(price: number): number {
  const parsed = Number(price);
  if (isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return Math.round(parsed * 100) / 100; // Round to 2 decimals
}

/**
 * Sanitize image URL to prevent path traversal
 */
export function sanitizeImageUrl(imageUrl: string, baseUrl: string): string {
  if (!imageUrl) return `${baseUrl}/image/placeholder.jpg`;

  // Remove any ../ path traversal attempts
  const cleanPath = imageUrl.replace(/\.\.\//g, '').replace(/\\/g, '/');

  // Ensure it starts with /
  const safePath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  return `${baseUrl}${safePath}`;
}
