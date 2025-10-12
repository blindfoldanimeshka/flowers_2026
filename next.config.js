/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    // Отключаем оптимизацию для uploads
    unoptimized: process.env.NODE_ENV === 'production',
    // Добавляем лоадер для статических изображений
    loader: process.env.NODE_ENV === 'production' ? 'custom' : 'default',
    loaderFile: process.env.NODE_ENV === 'production' ? './image-loader.js' : undefined,
  },
  experimental: {
    optimisticClientCache: true,
    serverMinification: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Добавляем обработку статических файлов
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
  // Настраиваем headers для изображений
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
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // Отключаем image-webpack-loader в production для статических файлов
    if (!dev && !isServer) {
      // Убираем image-webpack-loader для лучшей производительности
    }
    return config;
  },
};

module.exports = nextConfig;
