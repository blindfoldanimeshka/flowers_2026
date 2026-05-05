import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from '@/features/app/cart';
import CartButton from "./client/components/layout/CartButton";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { generateOrganizationSchema, generateWebSiteSchema } from '@/lib/structuredData';

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://floramix24.ru'),
  title: {
    default: "Floramix - Доставка цветов и букетов",
    template: "%s | Floramix",
  },
  description: "Floramix - интернет-магазин цветов с доставкой. Свежие букеты, композиции и цветочные подарки на любой случай. Быстрая доставка, гарантия качества.",
  keywords: ["цветы", "букеты", "доставка цветов", "купить цветы", "цветочный магазин", "floramix", "флорамикс"],
  authors: [{ name: "Floramix" }],
  creator: "Floramix",
  publisher: "Floramix",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: '/',
    siteName: 'Floramix',
    title: 'Floramix - Доставка цветов и букетов',
    description: 'Интернет-магазин цветов с доставкой. Свежие букеты, композиции и цветочные подарки на любой случай.',
    images: [
      {
        url: '/image/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Floramix - Доставка цветов',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebSiteSchema();

  return (
    <html lang="ru" className={`${inter.variable} h-full`}>
      <head>
        <link rel="icon" href="/favicon.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="min-h-screen">
        <CartProvider>
          <CartButton />
          {children}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </CartProvider>
      </body>
    </html>
  );
}
