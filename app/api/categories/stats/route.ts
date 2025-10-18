export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';

// GET - получение статистики товаров по категориям и подкатегориям
export async function GET(request: NextRequest) {
  try {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { default: Subcategory } = await import('@/models/Subcategory');
    const { default: Product } = await import('@/models/Product');

    // Агрегация для подсчета товаров в категориях
    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$categoryId',
          productCount: { $sum: 1 }
        }
      }
    ]);

    // Агрегация для подсчета товаров в подкатегориях  
    const subcategoryStats = await Product.aggregate([
      {
        $match: { subcategoryId: { $ne: null } }
      },
      {
        $group: {
          _id: '$subcategoryId',
          productCount: { $sum: 1 }
        }
      }
    ]);

    // Создаем мапы для быстрого доступа
    const categoryCountMap = new Map();
    categoryStats.forEach(stat => {
      if (stat._id) {
        categoryCountMap.set(stat._id.toString(), stat.productCount);
      }
    });

    const subcategoryCountMap = new Map();
    subcategoryStats.forEach(stat => {
      if (stat._id) {
        subcategoryCountMap.set(stat._id.toString(), stat.productCount);
      }
    });

    // Получаем все категории с подкатегориями
    const categories = await Category.find({}).populate('subcategories').lean();

    // Добавляем счетчики к категориям и подкатегориям
    const enrichedCategories = categories.map(category => {
      const categoryProductCount = categoryCountMap.get(category._id.toString()) || 0;
      
      const enrichedSubcategories = category.subcategories.map((subcategory: any) => ({
        ...subcategory,
        productCount: subcategoryCountMap.get(subcategory._id.toString()) || 0
      }));

      // Подсчитываем общее количество товаров в категории (включая подкатегории)
      const subcategoriesProductCount = enrichedSubcategories.reduce(
        (sum, sub) => sum + sub.productCount, 0
      );
      const totalProductCount = categoryProductCount + subcategoriesProductCount;

      return {
        ...category,
        productCount: categoryProductCount,
        subcategoriesProductCount: subcategoriesProductCount,
        totalProductCount: totalProductCount,
        subcategories: enrichedSubcategories
      };
    });

    return NextResponse.json({
      success: true,
      categories: enrichedCategories,
      summary: {
        totalCategories: categories.length,
        totalSubcategories: categories.reduce((sum, cat) => sum + cat.subcategories.length, 0),
        totalProducts: categoryStats.reduce((sum, stat) => sum + stat.productCount, 0)
      }
    });

  } catch (error: any) {
    console.error('Ошибка при получении статистики категорий:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении статистики категорий',
        details: error.message 
      },
      { status: 500 }
    );
  }
} 