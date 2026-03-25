'use client'

export default function OrderFormSkeleton() {
  return (
    <div className="grid gap-5 mt-0 lg:mt-10 h-auto text-center rounded-[20px] px-2 py-4 sm:px-4 sm:py-5 bg-[#ffffff] shadow-md animate-pulse w-full max-w-[350px] mx-auto">
      {/* Скелетон заголовка */}
      <div className="h-6 bg-gray-200 rounded-full w-3/4 mx-auto mb-2"></div>
      
      <div className="grid gap-3">
        {/* Скелетон подзаголовка данных */}
        <div className="h-5 bg-gray-200 rounded-full w-1/2 mx-auto"></div>
        
        {/* Скелетоны полей ввода */}
        <div className="h-[40px] bg-gray-200 rounded-[20px]"></div>
        <div className="h-[40px] bg-gray-200 rounded-[20px]"></div>
        <div className="h-[40px] bg-gray-200 rounded-[20px]"></div>
        <div className="h-[40px] bg-gray-200 rounded-[20px]"></div>
      </div>
      
      <div className="grid gap-3">
        {/* Скелетон подзаголовка способа оплаты */}
        <div className="h-5 bg-gray-200 rounded-full w-1/2 mx-auto"></div>
        
        {/* Скелетоны способов оплаты */}
        <div className="h-[36px] bg-gray-200 rounded-[15px]"></div>
        <div className="h-[36px] bg-gray-200 rounded-[15px]"></div>
      </div>
      
      <div className="mt-4">
        {/* Скелетон итоговой суммы */}
        <div className="flex justify-between mb-2">
          <div className="h-5 bg-gray-200 rounded-full w-1/4"></div>
          <div className="h-5 bg-gray-200 rounded-full w-1/6"></div>
        </div>
        
        {/* Скелетон кнопки */}
        <div className="h-10 bg-gray-200 rounded-[20px] w-full"></div>
      </div>
    </div>
  );
} 