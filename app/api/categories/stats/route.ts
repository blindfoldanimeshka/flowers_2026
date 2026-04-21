export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (request: NextRequest) => {
    await connect();
    const { default: Category } = await import('@/models/Category');
    const { default: Subcategory } = await import('@/models/Subcategory');
    const { default: Product } = await import('@/models/Product');

    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$categoryId',
          productCount: { $sum: 1 }
        }
      }
    ]);

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

    const [categories, allSubcategories] = await Promise.all([
      Category.find({}).lean(),
      Subcategory.find({}).lean(),
    ]);

    const subcategoriesByCategory = allSubcategories.reduce((acc, subcategory) => {
      const key = subcategory.categoryId.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(subcategory);
      return acc;
    }, {} as Record<string, typeof allSubcategories>);

    const enrichedCategories = categories.map(category => {
      const categoryProductCount = categoryCountMap.get(category._id.toString()) || 0;
      const enrichedSubcategories = (subcategoriesByCategory[category._id.toString()] || []).map((subcategory: any) => ({
        ...subcategory,
        productCount: subcategoryCountMap.get(subcategory._id.toString()) || 0
      }));

      const subcategoriesProductCount = enrichedSubcategories.reduce(
        (sum, sub) => sum + sub.productCount, 0
      );
      const totalProductCount = categoryProductCount + subcategoriesProductCount;

      return {
        ...category,
        productCount: categoryProductCount,
        subcategoriesProductCount,
        totalProductCount,
        subcategories: enrichedSubcategories
      };
    });

    return NextResponse.json({
      success: true,
      categories: enrichedCategories,
      summary: {
        totalCategories: categories.length,
        totalSubcategories: allSubcategories.length,
        totalProducts: categoryStats.reduce((sum, stat) => sum + stat.productCount, 0)
      }
    });

  
});
