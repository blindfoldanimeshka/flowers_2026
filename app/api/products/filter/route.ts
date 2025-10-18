export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    await connect();
    
    // Получаем параметры фильтрации из URL
    const searchParams = request.nextUrl.searchParams;
    
    // Создаем объект с условиями фильтрации
    const filterConditions: any = {};
    
    // Фильтрация по категории
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      filterConditions.categoryId = Number(categoryId);
    }
    
    // Фильтрация по подкатегории
    const subcategoryId = searchParams.get('subcategoryId');
    if (subcategoryId) {
      filterConditions.subcategoryId = Number(subcategoryId);
    }
    
    // Фильтрация по наличию
    const inStock = searchParams.get('inStock');
    if (inStock !== null) {
      filterConditions.inStock = inStock === 'true';
    }
    
    // Фильтрация по диапазону цен
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    
    if (minPrice || maxPrice) {
      filterConditions.price = {};
      
      if (minPrice) {
        filterConditions.price.$gte = Number(minPrice);
      }
      
      if (maxPrice) {
        filterConditions.price.$lte = Number(maxPrice);
      }
    }
    
    // Фильтрация по поисковому запросу
    const query = searchParams.get('query');
    if (query) {
      filterConditions.title = { $regex: query, $options: 'i' };
    }
    
    // Сортировка
    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    
    // Пагинация
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Получаем товары с применением фильтров и пагинации
    const products = await Product.find(filterConditions)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);
    
    // Получаем общее количество товаров для пагинации
    const totalCount = await Product.countDocuments(filterConditions);
    
    return NextResponse.json(
      { 
        products,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Ошибка при фильтрации товаров:', error);
    return NextResponse.json(
      { error: 'Ошибка при фильтрации товаров', details: error.message },
      { status: 500 }
    );
  }
}