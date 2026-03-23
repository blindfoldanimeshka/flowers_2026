'use client'

import Link from "next/link";
import { useCart } from '@/features/app/cart';
import { usePathname, useRouter } from "next/navigation";

export default function CartIconMobile() {
    const { getTotalItems } = useCart();
    const totalItems = getTotalItems();
    const pathname = usePathname();
    const router = useRouter();
    
    const isCartPage = pathname === '/client/cart';

    return isCartPage ? (
        <button 
            onClick={() => router.back()} 
            className="relative hover:scale-110 transition-all duration-300"
            aria-label="Вернуться назад"
        >
            <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
            >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
            </svg>
        </button>
    ) : (
        <Link href="/client/cart" className="relative">
            <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
            >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            
            {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#D8FEE9] text-black font-bold w-5 h-5 flex items-center justify-center rounded-full text-xs">
                    {totalItems}
                </span>
            )}
        </Link>
    );
} 
