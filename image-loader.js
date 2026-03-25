// Custom image loader для production
export default function customLoader({ src, width, quality }) {
  // Для загруженных изображений возвращаем оригинальный src
  if (src.startsWith('/uploads/')) {
    return src;
  }
  
  // Для других изображений используем стандартную оптимизацию
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
} 