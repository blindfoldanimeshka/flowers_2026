"use client";
import Image from "next/image";
import Nav from "./Nav";
import CartIcon from "./CartIcon";
import Link from "next/link";
import { useState } from "react";
// Если есть компонент Social, импортируй его
// import Social from "../../element/Header/Social";

export default function TopHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div className="w-full bg-[#FFE1E1] px-2 py-2 sm:p-3">
            {/* Мобильная версия */}
            <div className="flex items-center justify-between w-full md:hidden">
                {/* Левая часть: соцсети + корзина */}
                <div className="flex items-center gap-2">
                    {/* Кнопка соцсетей */}
                    {/* <Social /> */}
                    <CartIcon />
                </div>
                {/* Логотип */}
                <Link href="/" className="flex items-center gap-x-2">
                    <Image src="/image/logo.svg" alt="logo" width={32} height={32} className="sm:w-[40px] sm:h-[40px]" />
                    <h1 className="text-[22px] sm:text-[32px] font-bold">Floramix</h1>
                </Link>
                {/* Бургер-меню справа */}
                <button className="flex flex-col justify-center items-center w-10 h-10" onClick={() => setMenuOpen(!menuOpen)} aria-label="Открыть меню">
                    <span className={`block w-6 h-0.5 bg-black mb-1 transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                    <span className={`block w-6 h-0.5 bg-black mb-1 transition-all ${menuOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-6 h-0.5 bg-black transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                </button>
            </div>
            {/* Мобильное меню */}
            {menuOpen && (
                <div className="md:hidden mt-2 animate-fadeIn">
                    <Nav />
                </div>
            )}
            {/* ПК-версия */}
            <div className="hidden md:flex items-center justify-between w-full">
                {/* Логотип */}
                <Link href="/" className="flex items-center gap-x-2">
                    <Image src="/image/logo.svg" alt="logo" width={40} height={40} />
                    <h1 className="text-[38px] font-bold">Floramix</h1>
                </Link>
                {/* Навигация с паддингами */}
                <div className="px-8 md:px-12 w-full">
                  <Nav />
                </div>
                {/* Корзина */}
                <div className="flex items-center justify-end ml-8">
                    <CartIcon />
                </div>
                {/* Здесь можно добавить админ-панель, если нужно */}
            </div>
        </div>
    )
}
