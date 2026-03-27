export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import { escapeRegExp, safeSearchTerm, toIntInRange } from '@/lib/security';

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
        const parsedMinPrice = Number(minPrice);
        if (Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0) {
          filterConditions.price.$gte = parsedMinPrice;
        }
      }

      if (maxPrice) {
        const parsedMaxPrice = Number(maxPrice);
        if (Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
          filterConditions.price.$lte = parsedMaxPrice;
        }
      }
    }

    const query = safeSearchTerm(searchParams.get('query'));
    if (query) {
      filterConditions.$or = [
        { name: { $regex: escapeRegExp(query), $options: 'i' } },
        { description: { $regex: escapeRegExp(query), $options: 'i' } }
      ];
    }

    const allowedSortFields = new Set(['createdAt', 'price', 'name']);
    const rawSortField = searchParams.get('sortField') || 'createdAt';
    const sortField = allowedSortFields.has(rawSortField) ? rawSortField : 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const page = toIntInRange(searchParams.get('page'), 1, 1, 1000);
    const limit = toIntInRange(searchParams.get('limit'), 10, 1, 100);
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
