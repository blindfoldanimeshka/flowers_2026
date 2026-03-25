'use client'

export default function ShopItemSkeleton() {
  return (
    <div className="bg-[#FFE1E1] grid justify-center items-center text-center rounded-[30px] gap-y-2 shadow-sm relative w-full max-w-[200px] sm:w-60 mx-auto overflow-hidden animate-pulse">
      {/* Скелетон изображения */}
      <div className="w-full max-w-[200px] h-40 sm:w-60 sm:h-60 relative bg-gray-200 rounded-t-[30px] mx-auto"></div>
      
      {/* Скелетон информации о товаре */}
      <div className="px-2 pt-2 w-full">
        <div className="h-6 bg-gray-200 rounded-full w-3/4 mx-auto"></div>
        
        {/* Скелетон цены */}
        <div className="flex justify-center items-center gap-2 my-2">
          <div className="h-5 bg-gray-200 rounded-full w-1/2"></div>
        </div>
      </div>
      
      {/* Скелетон кнопки */}
      <div className="h-10 bg-gray-200 rounded-[0_0_30px_30px] w-full mt-auto"></div>
    </div>
  );
} 