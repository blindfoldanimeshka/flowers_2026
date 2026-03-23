import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connect();

    const { id } = params;
    const category = await Category.findById(id);

    if (!category) {
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }

    const subcategories = await Subcategory.find({ categoryId: id }).lean();
    return NextResponse.json({ subcategories }, { status: 200 });
  } catch (error: any) {
    console.error(`Ошибка при получении подкатегорий для категории с ID ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Ошибка при получении подкатегорий', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    {
      error: 'Этот API-маршрут устарел. Используйте POST /api/subcategories с параметром categoryId в теле запроса.',
      redirect_to: '/api/subcategories',
      example: {
        url: '/api/subcategories',
        method: 'POST',
        body: {
          name: 'Название подкатегории',
          categoryId: params.id,
          description: 'Описание (необязательно)',
          image: 'URL изображения (необязательно)',
          isActive: true
        }
      }
    },
    { status: 301 }
  );
}

export async function PUT(_request: NextRequest, _params: { params: { id: string } }) {
  return NextResponse.json(
    {
      error: 'Этот API-маршрут не поддерживается. Используйте PUT /api/subcategories/[subcategoryId] для обновления отдельной подкатегории.',
      redirect_to: '/api/subcategories/[subcategoryId]'
    },
    { status: 405 }
  );
}
