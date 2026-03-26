export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Subcategory from '@/models/Subcategory';
import { revalidatePath } from 'next/cache';

function normalizeProductImages(input: unknown): { image?: string; images?: string[] } {
  const raw = Array.isArray(input) ? input : [];
  const images = Array.from(
    new Set(
      raw
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  ).slice(0, 3);

  if (images.length === 0) return {};
  return { image: images[0], images };
}

// GET all products
export async function GET(request: NextRequest) {
  try {
    await connect();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const categoryNumId = searchParams.get('categoryNumId');
    const subcategoryNumId = searchParams.get('subcategoryNumId');

    const query: any = {};
    
    // Фильтрация по ObjectId категории
    if (categoryId) query.categoryId = categoryId;
    
    // Фильтрация по ObjectId подкатегории
    if (subcategoryId) query.subcategoryId = subcategoryId;
    
    // Фильтрация по числовому ID категории
    if (categoryNumId) {
      const numId = parseInt(categoryNumId, 10);
      if (!isNaN(numId)) {
        query.categoryNumId = numId;
      }
    }
    
    // Фильтрация по числовому ID подкатегории
    if (subcategoryNumId) {
      const numId = parseInt(subcategoryNumId, 10);
      if (!isNaN(numId)) {
        query.subcategoryNumId = numId;
      }
    }
    
    console.log('PRODUCTS API QUERY:', query);
    const products = await Product.find(query).lean();
    console.log('PRODUCTS API RESULT:', products);
    return NextResponse.json(products);
  } catch (error) {
    console.error('Ошибка при получении товаров:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST a new product
export async function POST(request: NextRequest) {
  try {
    await connect();
    const body = await request.json();
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }

    // Получаем категорию для числового ID
    if (body.categoryId) {
      const category = await Category.findById(body.categoryId);
      if (!category) {
        return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
      }
      body.categoryNumId = category.id; // Устанавливаем числовой ID категории
    } else {
      return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 });
    }

    // Обрабатываем подкатегорию, если она указана
    if (body.subcategoryId) {
      const subcategory = await Subcategory.findById(body.subcategoryId);
      if (!subcategory) {
        return NextResponse.json({ error: 'Подкатегория не найдена' }, { status: 404 });
      }
      body.subcategoryNumId = subcategory.categoryNumId; // Устанавливаем числовой ID подкатегории
    } else {
      // Удаляем subcategoryId если оно пустое или null
      delete body.subcategoryId;
      delete body.subcategoryNumId;
    }

    const newProduct = await Product.create(body);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка при создании товара:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ error: 'Ошибка валидации', details: validationErrors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка при создании товара', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connect();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Товар успешно удалён' });
  } catch (error) {
    console.error('Ошибка при удалении товара:', error);
    return NextResponse.json({ error: 'Ошибка при удалении товара' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }

    if (!id) {
      return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Ошибка при обновлении товара:', error);
    // ... (error handling)
    return NextResponse.json({ error: 'Ошибка при обновлении товара' }, { status: 500 });
  }
}
