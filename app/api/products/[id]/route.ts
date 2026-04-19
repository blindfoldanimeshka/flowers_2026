import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connect from '@/lib/db';
import Product from '@/models/Product';
import { isValidId } from '@/lib/id';
import { sanitizeMongoObject } from '@/lib/security';

type RouteContext = { params: Promise<{ id: string }> };

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

// GET product by id
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await connect();

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при получении товара:', error);
    return NextResponse.json({ error: 'Ошибка при получении товара', details: error?.message }, { status: 500 });
  }
}

// PUT product by id
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await connect();

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
    }

    const body = sanitizeMongoObject(await request.json());
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
    if (typeof body.description === 'string') updateData.description = body.description;
    if (typeof body.price === 'number' && Number.isFinite(body.price) && body.price >= 0) updateData.price = body.price;
    if (typeof body.inStock === 'boolean') updateData.inStock = body.inStock;
    if (typeof body.preorderOnly === 'boolean') updateData.preorderOnly = body.preorderOnly;
    if (typeof body.assemblyTime === 'string') updateData.assemblyTime = body.assemblyTime.trim();
    if (typeof body.stockUnit === 'string' && body.stockUnit.trim()) updateData.stockUnit = body.stockUnit.trim();
    if (
      (typeof body.stockQuantity === 'number' && Number.isFinite(body.stockQuantity)) ||
      (typeof body.stockQuantity === 'string' && body.stockQuantity.trim())
    ) {
      const normalized = Number(body.stockQuantity);
      if (Number.isFinite(normalized) && normalized >= 0) {
        updateData.stockQuantity = Math.floor(normalized);
      }
    }
    if (typeof body.categoryId === 'string' && body.categoryId.trim()) updateData.categoryId = body.categoryId.trim();
    if (typeof body.subcategoryId === 'string' && body.subcategoryId.trim()) updateData.subcategoryId = body.subcategoryId.trim();
    if (typeof body.image === 'string' && body.image.trim()) updateData.image = body.image.trim();
    if (Array.isArray(body.images)) updateData.images = body.images.filter((item: unknown) => typeof item === 'string').slice(0, 3);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Нет допустимых полей для обновления' }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    if (!updatedProduct) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении товара:', error);

    if (error?.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((err: any) => err?.message).filter(Boolean);
      return NextResponse.json({ error: 'Ошибка валидации', details: validationErrors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Ошибка при обновлении товара', details: error?.message }, { status: 500 });
  }
}

// DELETE product by id
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    await connect();

    const { id } = await params;
    if (!isValidId(id)) {
      return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/category', 'layout');

    return NextResponse.json({ message: 'Товар успешно удален' }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при удалении товара:', error);
    return NextResponse.json({ error: 'Ошибка при удалении товара', details: error?.message }, { status: 500 });
  }
}
