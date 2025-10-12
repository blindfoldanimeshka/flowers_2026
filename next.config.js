/** @type {import('next').NextConfig} */
const nextConfig = {
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // ESLint конфигурация
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks', 'models'],
  },
  
  // TypeScript конфигурация
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Экспериментальные функции
  experimental: {
    optimizePackageImports: ['framer-motion', 'react-icons'],
    serverMinification: true,
  },
  
  // Компилятор
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Обработка статических файлов
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
  
  // Заголовки для безопасности
  async headers() {
    return [
      {
        source: '/api/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Оптимизация сборки
  swcMinify: true,
  compress: true,
  
  // Переменные окружения
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;
