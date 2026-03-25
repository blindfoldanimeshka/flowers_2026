'use client'

export default function CartItemSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 bg-white border-[1px] border-[#FFDADA] p-2 sm:p-3 rounded-[15px] shadow-sm animate-pulse w-full max-w-[350px] mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        {/* Скелетон изображения */}
        <div className="w-[80px] h-[90px] bg-gray-200 rounded-[10px] mx-auto"></div>
        <div className="text-center sm:text-left w-full">
          {/* Скелетон названия */}
          <div className="h-6 bg-gray-200 rounded-full w-3/4 mx-auto sm:mx-0 mb-2"></div>
          {/* Скелетон цены */}
          <div className="h-4 bg-gray-200 rounded-full w-1/2 mx-auto sm:mx-0 mb-2"></div>
          {/* Скелетон итоговой цены */}
          <div className="h-5 bg-gray-200 rounded-full w-2/3 mx-auto sm:mx-0"></div>
        </div>
      </div>
      
      {/* Скелетон кнопок количества */}
      <div className="flex items-center gap-1 mx-auto">
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
        <div className="h-6 w-6 bg-gray-200 rounded-full mx-1"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>
      
      {/* Скелетон кнопки удаления */}
      <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto"></div>
    </div>
  );
} 