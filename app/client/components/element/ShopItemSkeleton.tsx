'use client'

export default function ShopItemSkeleton() {
  return (
    <div className="bg-[#FFE1E1] rounded-[30px] shadow-sm pb-0 flex flex-col items-center w-full min-w-0 max-w-none mx-0 h-[320px] sm:h-[380px] relative group overflow-hidden animate-pulse">
      {/* image area (в ShopItem это отдельная button) */}
      <div className="w-full h-[160px] sm:h-[210px] relative rounded-t-[30px] overflow-hidden flex-shrink-0 bg-gray-200" />

      {/* content area (в ShopItem это flex-1 button с текстом/ценой) */}
      <div className="flex flex-col items-center justify-center w-full flex-1 px-2">
        <div className="h-[26px] sm:h-[34px] bg-gray-200 rounded-full w-[80%]" />
        {/* description показывается только на mobile в ShopItem */}
        <div className="sm:hidden mt-1 h-[18px] bg-gray-200 rounded-full w-[70%]" />

        <div className="flex justify-center items-center gap-1 w-full text-center mt-1">
          {/* old price (условно) */}
          <div className="h-[18px] bg-gray-200 rounded-full w-[35%] hidden sm:block" />
          <div className="h-[22px] sm:h-[28px] bg-gray-200 rounded-full w-[40%]" />
        </div>
      </div>

      {/* bottom action button (mt-auto) */}
      <div className="w-full mt-auto py-2 sm:py-3 px-2 sm:px-4 rounded-[0_0_30px_30px] bg-gray-200 flex items-center justify-center">
        <div className="h-3.5 sm:h-4 bg-gray-300 rounded-full w-[55%]" />
      </div>
    </div>
  );
} 