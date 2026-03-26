'use client'

import ShopItem from "../element/ShopItem";
import ShopItemSkeleton from "../element/ShopItemSkeleton";
import { useCatalogProductsViewModel } from '@/features/app/catalog';

export default function Catalog({ categoryId, subcategoryId, title }: { categoryId?: string, subcategoryId?: string, title?: string }) {
  const { loading, products, isEmpty } = useCatalogProductsViewModel({ categoryId, subcategoryId });

  const getAnimationClass = (index: number, itemsPerRow: number = 4) => {
    const rowPosition = index % itemsPerRow;
    return rowPosition < itemsPerRow / 2 ? 'animate-slide-in-left' : 'animate-slide-in-right';
  };

  const getAnimationDelay = (index: number) => {
    return `${(index % 4) * 0.05}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center my-4 sm:my-10">
        {title && (
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8 text-center px-4">{title}</h1>
        )}
        <div className="w-full max-w-7xl mb-4 sm:mb-8 px-4">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {Array(8).fill(0).map((_, index) => (
              <ShopItemSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex justify-center my-4 sm:my-10 px-4">
        <div className="text-center p-6 sm:p-8 bg-[#FFE1E1] rounded-[20px] shadow-sm">
          <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Товары не найдены</h2>
          <p className="text-gray-700">К сожалению, товары в данной категории отсутствуют.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center my-4 sm:my-10">
      {title && (
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8 text-center px-4">{title}</h1>
      )}

      <div className="w-full max-w-7xl mb-4 sm:mb-8 px-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
          {products.map((product, index) => (
            <div
              key={product._id}
              className={`opacity-0 ${getAnimationClass(index, typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 4)}`}
              style={{ animationDelay: getAnimationDelay(index) }}
            >
              <ShopItem
                id={product._id}
                title={product.name}
                price={product.price}
                description={product.description}
                imageSrc={product.image}
                imageGallery={product.images}
                inStock={product.inStock}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
