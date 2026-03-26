"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCategoriesViewModel } from '@/features/app/catalog';

export default function HeaderMobile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextUrl, setNextUrl] = useState("");
  const router = useRouter();
  const { categories } = useCategoriesViewModel();

  useEffect(() => {
    setMounted(true);
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("menu-open");
      setIsClosing(false);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const handleAnimatedNav = (url: string) => {
    setIsTransitioning(true);
    setIsClosing(true);
    setNextUrl(url);
    setTimeout(() => {
      setIsTransitioning(false);
      setIsClosing(false);
      setMenuOpen(false);
      router.push(url);
    }, 320);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFE1E1] h-14 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/image/logo.svg" alt="Floramix" width={32} height={32} loading="eager" />
          <span className="font-bold text-lg">Floramix</span>
        </Link>
        <div className="relative">
          <button
            className="flex flex-col justify-center items-center w-10 h-10"
            onClick={() => menuOpen ? handleClose() : setMenuOpen(true)}
            aria-label="Открыть меню"
          >
            <span className={`block w-6 h-0.5 bg-black mb-1 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-black mb-1 transition-all ${menuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-black transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
          </button>
        </div>
      </header>
      <div className="w-full bg-[#FFE1E1] text-center py-1 text-[13px] font-medium border-b border-[#FFD6D6]">
        <span>+7 (999) 123-45-67</span> &nbsp;|&nbsp; <span>Ежедневно 9:00–21:00</span>
      </div>
      {mounted && menuOpen && createPortal(
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-all duration-300 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
            onClick={handleClose}
            aria-label="Закрыть меню"
          />
          <nav
            className={`fixed top-0 right-0 h-full w-72 max-w-full bg-white z-50 shadow-2xl p-4 ${isClosing ? 'animate-slideOut' : 'animate-slideIn'}`}
            style={{ boxShadow: "-8px 0 32px 0 rgba(0,0,0,0.10)" }}
          >
            <div className="relative">
              <button
                className="flex flex-col justify-center items-center w-10 h-10"
                onClick={handleClose}
                aria-label="Закрыть меню"
              >
                <span className="block w-6 h-0.5 bg-black rotate-45 absolute"></span>
                <span className="block w-6 h-0.5 bg-black -rotate-45 absolute"></span>
              </button>
            </div>
            <ul className="mt-2">
              {categories.map(category => (
                <li key={category._id} className="mb-2">
                  <button
                    type="button"
                    className="font-bold text-lg text-[#FF6B6B] hover:underline py-3 px-2 rounded-lg block w-full text-left active:bg-[#ffe1e1] focus:bg-[#ffe1e1] transition-all duration-300"
                    onClick={() => handleAnimatedNav(`/category/${category.slug}`)}
                  >
                    {category.name}
                  </button>
                  {category.subcategories?.length > 0 && (
                    <ul className="ml-4 mt-1">
                      {category.subcategories.map(sub => (
                        <li key={sub._id}>
                          <button
                            type="button"
                            className="text-gray-700 hover:text-[#FF6B6B] text-base block py-2 px-4 rounded-md w-full text-left active:bg-[#fff0f0] focus:bg-[#fff0f0] transition-all duration-300"
                            onClick={() => handleAnimatedNav(`/category/${category.slug}/${sub.slug}`)}
                          >
                            {sub.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </>,
        document.body
      )}
      <style jsx global>{`
        body.menu-open > #__next > *:not(header):not(nav):not(.fixed):not(.z-50) {
          filter: blur(4px) brightness(0.85);
          transition: all 0.3s ease-out;
          transform: translateX(-80px);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-fadeOut {
          animation: fadeOut 0.3s ease-out forwards;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }

        .animate-slideOut {
          animation: slideOut 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
