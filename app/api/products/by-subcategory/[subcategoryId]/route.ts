export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Subcategory from '@/models/Subcategory';
import { isValidId } from '@/lib/id';

type RouteContext = { params: Promise<{ subcategoryId: string }> };

// GET запрос для получения товаров по ID подкатегории
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await connect();
    
    const { subcategoryId } = await params;
    
    // Проверка валидности subcategoryId (ObjectId)
    if (!isValidId(subcategoryId)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Неверный формат ID подкатегории' 
        },
        { status: 400 }
      );
    }
    
    // Проверяем, существует ли подкатегория
    const subcategory = await Subcategory.findById(subcategoryId).populate('categoryId', 'name slug');
    if (!subcategory) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Подкатегория не найдена' 
        },
        { status: 404 }
      );
    }
    
    // Получаем все товары в подкатегории
    const products = await Product.find({ subcategoryId })
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug')
      .lean();
    
    return NextResponse.json({ 
      success: true,
      products,
      subcategory: {
        id: subcategory._id,
        name: subcategory.name,
        slug: subcategory.slug,
        category: subcategory.categoryId
      },
      count: products.length
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Ошибка при получении товаров подкатегории:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка при получении товаров подкатегории', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
