export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';

export async function GET(request: NextRequest) {
  try {
    await connect();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json(
        { error: 'Поисковый запрос не указан' },
        { status: 400 }
      );
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при поиске товаров:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске товаров', details: error.message },
      { status: 500 }
    );
  }
}
