import { NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Subcategory from '@/models/Subcategory';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
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
  
});

// Этот маршрут может использовать только GET 