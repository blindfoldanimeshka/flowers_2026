import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from '@/features/app/cart';
import { StageWiseInit } from "./components/Stagewise";
import CartButton from "./client/components/layout/CartButton";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AdminNotifications from '@/components/AdminNotifications';

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Floramix",
  description: "Цветы на любой вкус",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body>
        <CartProvider>
          <StageWiseInit />
          <CartButton />
          {children}
          
          {/* Toast контейнер для глобальных уведомлений */}
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
          
          {/* Уведомления для администраторов на всех страницах */}
          <AdminNotifications pollingInterval={45000} />
        </CartProvider>
      </body>
    </html>
  );
}
