'use client'

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ICategory } from '@/app/client/models/Category';
import { useCategoriesViewModel } from '@/features/app/catalog';

const MAX_HEADER_CATEGORIES = 10;

function ArrowDownIcon({ isOpen, compact }: { isOpen: boolean; compact: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={compact ? 12 : 16}
      height={compact ? 12 : 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${compact ? 'ml-0.5' : 'ml-1'} transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

function NavItem({ category, compact }: { category: ICategory; compact: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const navItemRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseOver = (event: React.MouseEvent) => {
    if (navItemRef.current?.contains(event.target as Node) ||
        dropdownRef.current?.contains(event.target as Node)) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = (event: React.MouseEvent) => {
    try {
      const relatedTarget = event.relatedTarget as Node | null;

      if (!relatedTarget ||
          (!navItemRef.current?.contains(relatedTarget) &&
           !dropdownRef.current?.contains(relatedTarget))) {
        setIsOpen(false);
      }
    } catch {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      try {
        const target = event.target as Node | null;
        if (!target) return;

        if (navItemRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
          setIsOpen(true);
        } else if (isOpen) {
          setIsOpen(false);
        }
      } catch {
        if (isOpen) setIsOpen(false);
      }
    };

    document.addEventListener('mouseover', handleGlobalMouseMove);
    return () => {
      document.removeEventListener('mouseover', handleGlobalMouseMove);
    };
  }, [isOpen]);

  return (
    <div
      ref={navItemRef}
      className="relative flex justify-center items-center min-w-0 px-1"
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-center cursor-pointer min-w-0">
        <Link
          href={`/category/${category.slug}`}
          className={`font-semibold duration-300 hover:text-[#FF6B6B] block leading-tight ${
            compact
              ? 'text-[clamp(13px,1.1vw,18px)] whitespace-normal text-center break-words'
              : 'text-[20px] whitespace-nowrap'
          }`}
        >
          {category.name}
        </Link>
        <ArrowDownIcon isOpen={isOpen} compact={compact} />
      </div>

      {isOpen && category.subcategories?.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 py-2 w-48 bg-white rounded-[20px] shadow-lg z-10 animate-fadeIn border border-[#FFE1E1]"
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
        >
          <div className="absolute h-3 w-full top-[-12px]"></div>
          {category.subcategories.map((subcategory, index) => (
            <Link
              key={subcategory._id}
              href={`/category/${category.slug}/${subcategory.slug}`}
              className={`block px-4 py-2 text-[16px] hover:bg-[#FFE1E1] hover:font-medium transition-all duration-300 ${
                index === 0 ? 'rounded-t-[16px]' : ''
              } ${
                index === category.subcategories.length - 1 ? 'rounded-b-[16px]' : ''
              }`}
            >
              {subcategory.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const { categories } = useCategoriesViewModel();
  const visibleCategories = categories.slice(0, MAX_HEADER_CATEGORIES);
  const isCompact = visibleCategories.length > 5;

  return (
    <nav
      className={`justify-center items-center w-full mx-auto overflow-visible ${
        isCompact
          ? 'grid grid-cols-5 grid-rows-2 gap-x-4 gap-y-4 px-3 py-1 w-full max-w-none'
          : 'flex flex-row gap-6 px-4 min-h-[48px] max-w-screen-md'
      }`}
    >
      {visibleCategories.map((category) => (
        <NavItem key={category._id} category={category} compact={isCompact} />
      ))}
    </nav>
  );
}
