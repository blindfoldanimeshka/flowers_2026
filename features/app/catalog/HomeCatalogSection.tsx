'use client';

import { motion } from "framer-motion";
import ShopItem from "@/app/client/components/element/ShopItem";
import ShopItemSkeleton from "@/app/client/components/element/ShopItemSkeleton";
import { useHomeCatalogViewModel } from './useHomeCatalogViewModel';

export default function HomeCatalogSection() {
  const { loading, products } = useHomeCatalogViewModel();

  return (
    <div className="flex flex-col items-center my-4 sm:my-10 px-4 sm:px-0">
      <motion.h1
        className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-8 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Наша коллекция
      </motion.h1>
      {loading ? (
        <motion.div
          className="w-full max-w-7xl grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 xl:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {Array(8).fill(0).map((_, index) => <ShopItemSkeleton key={index} />)}
        </motion.div>
      ) : (
        <motion.div
          className="w-full max-w-7xl grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 xl:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          {products.map((product, index) => (
            <motion.div
              key={product._id || index}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: 'spring',
                damping: 18,
                stiffness: 120,
                delay: index * 0.06,
              }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              <ShopItem
                id={String(product._id)}
                title={product.name}
                price={product.price}
                description={product.description}
                imageSrc={product.image}
                imageGallery={product.images}
                inStock={product.inStock}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
