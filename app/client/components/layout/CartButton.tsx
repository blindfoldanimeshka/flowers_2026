'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function CartButton() {
  const pathname = usePathname();
  const router = useRouter();
  const isCartPage = pathname === '/client/cart';
  const isAdminRoute = pathname?.startsWith('/admin');
  const isAuthRoute = pathname?.startsWith('/auth');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (isAdminRoute || isAuthRoute) {
    return null;
  }

  const buttonClasses = "w-14 h-14 rounded-full bg-pink-400 hover:bg-pink-300 active:scale-90 shadow-lg flex items-center justify-center transition-all duration-300";
  const iconClasses = `transition-all duration-300 ${isAnimating ? 'scale-0 rotate-180' : 'scale-100 rotate-0'}`;

  if (isCartPage) {
    return (
      <div className="fixed z-50 md:hidden" style={{ bottom: "var(--float-offset-bottom)", right: "calc(96px + var(--safe-area-right))" }}>
        <button
          onClick={() => router.back()}
          className={buttonClasses}
          aria-label="Вернуться назад"
        >
          <div className={iconClasses}>
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="2"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed z-50 md:hidden" style={{ bottom: "var(--float-offset-bottom)", right: "calc(96px + var(--safe-area-right))" }}>
      <Link
        href="/client/cart"
        className={buttonClasses}
      >
        <div className={`relative ${iconClasses}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
            <path d="M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
            <path d="M20 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
      </Link>
    </div>
  )
} 
