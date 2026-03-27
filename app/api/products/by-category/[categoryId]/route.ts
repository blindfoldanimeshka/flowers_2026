export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { isValidId } from '@/lib/id';

type RouteContext = { params: Promise<{ categoryId: string }> };

// GET запрос для получения товаров по ID категории
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
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
  } catch (error: unknown) {
    console.error('Ошибка при получении товаров категории:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении товаров категории', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
