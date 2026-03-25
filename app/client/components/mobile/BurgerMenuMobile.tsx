"use client";
// Мобильное бургер-меню: слайдится справа, overlay, z-50
export default function BurgerMenuMobile() {
  return (
    <aside className="fixed top-0 right-0 h-full w-4/5 bg-white z-50 shadow-lg animate-slideInRight md:hidden">
      {/* Кнопка закрытия */}
      {/* <button>Закрыть</button> */}
      {/* <CategoryListMobile /> */}
      {/* Контакты, адрес, время работы */}
      {/* <SocialMobile /> */}
    </aside>
  );
} 