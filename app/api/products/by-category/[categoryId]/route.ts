export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { isValidId } from '@/lib/id';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type RouteContext = { params: Promise<{ categoryId: string }> };

// GET запрос для получения товаров по ID категории
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteContext) => {
    await connect();
    
    const { categoryId } = await params;
    
    // Проверка валидности categoryId (ObjectId)
    if (!isValidId(categoryId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Неверный формат ID категории' 
        },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли категория
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Категория не найдена' 
        },
        { status: 404 }
      );
    }
    
    // Получаем все товары в категории
    const products = await Product.find({ categoryId })
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug')
      .lean();
    
    return NextResponse.json({ 
      success: true,
      products,
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug
      },
      count: products.length
    }, { status: 200 });
  
});
