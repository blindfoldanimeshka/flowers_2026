import { NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Subcategory from '@/models/Subcategory';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connect();

    // Загружаем все подкатегории один раз
    const subcategories = await Subcategory.find({}).lean();
    const subcategoryMap = new Map(subcategories.map(sub => [String(sub._id), sub.name]));

    const products = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    // Добавляем имя подкатегории к каждому продукту
    const productsWithSubcategory = products.map(product => ({
      ...product,
      subcategoryName: subcategoryMap.get(product.subcategoryId.toString()) || 'Без категории',
    }));

    return NextResponse.json(productsWithSubcategory);
  } catch (error: any) {
    console.error('Ошибка при получении избранных товаров:', error);
    return NextResponse.json({ error: 'Failed to fetch featured products' }, { status: 500 });
  }
}

// Этот маршрут может использовать только GET 