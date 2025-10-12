'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

interface Subcategory {
  _id?: string;
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

interface Category {
  _id?: string;
  id: number;
  name: string;
  slug: string;
  image?: string;
  subcategories: Subcategory[];
}

function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setCategories(data) : setCategories([]));
  }, []);
  return categories;
}

export default function CategoryGrid() {
  const categories = useCategories();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      <motion.h2 
        className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        Категории
      </motion.h2>
      
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 xl:gap-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {categories.map(category => (
          <motion.div
            key={category._id || category.id}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              href={`/category/${category.slug}`}
              className="group"
            >
              <div className="relative w-full h-48 sm:h-64 rounded-[20px] sm:rounded-[30px] overflow-hidden bg-[#FFE9E9] shadow-md hover:shadow-lg transition-all duration-300">
                {/* Фоновое изображение */}
                <div className="absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity duration-300">
                  <Image 
                    src="/image/items/11.png" 
                    alt={category.name}
                    fill
                    className="object-cover opacity-40 group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                
                {/* Контент категории */}
                <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                  <h3 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-3 group-hover:mb-4 transition-all duration-300 w-full flex justify-center text-center">
                    {category.name}
                  </h3>
                  
                  <div className="hidden sm:flex flex-wrap justify-center gap-2">
                    {category.subcategories && category.subcategories.map(subcategory => (
                      <span 
                        key={subcategory._id || subcategory.id}
                        className="px-2 sm:px-3 py-1 bg-white/70 rounded-full text-xs sm:text-sm"
                      >
                        {subcategory.name}
                      </span>
                    ))}
                  </div>
                  
                  <div className="mt-3 sm:mt-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#D8FEE9] rounded-full text-sm font-medium">
                      Смотреть
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}