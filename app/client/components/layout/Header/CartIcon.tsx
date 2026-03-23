'use client'

import Link from "next/link";
import { useCart } from '@/features/app/cart';

export default function CartIcon() {
    const { getTotalItems } = useCart();
    const totalItems = getTotalItems();
    
    return (
        <Link href="/client/cart" className="relative hover:scale-110 transition-all duration-300">
            <svg 
                width="30" 
                height="30" 
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
                <span className="absolute -top-2 -right-2 bg-[#D8FEE9] text-black font-bold w-6 h-6 flex items-center justify-center rounded-full text-sm">
                    {totalItems}
                </span>
            )}
        </Link>
    );
} 
