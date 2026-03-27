export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import { escapeRegExp, safeSearchTerm } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    await connect();

    const searchParams = request.nextUrl.searchParams;
    const query = safeSearchTerm(searchParams.get('query'));

    if (!query) {
      return NextResponse.json(
        { error: 'Поисковый запрос не указан' },
        { status: 400 }
      );
    }

    const escaped = escapeRegExp(query);
    const products = await Product.find({
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ],
    });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при поиске товаров:', error);
    return NextResponse.json(
      {
        error: 'Ошибка при поиске товаров',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
