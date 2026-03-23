export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    await connect();

    const searchParams = request.nextUrl.searchParams;
    const filterConditions: any = {};

    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      filterConditions.categoryId = categoryId;
    }

    const subcategoryId = searchParams.get('subcategoryId');
    if (subcategoryId) {
      filterConditions.subcategoryId = subcategoryId;
    }

    const inStock = searchParams.get('inStock');
    if (inStock !== null) {
      filterConditions.inStock = inStock === 'true';
    }

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

    const query = searchParams.get('query');
    if (query) {
      filterConditions.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    const sortField = searchParams.get('sortField') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const products = await Product.find(filterConditions)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

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
