import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Product from '@/models/Product';
import { isValidId } from '@/lib/id';
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

type RouteContext = { params: Promise<{ id: string }> };

// GET запрос для получения товара по ID
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await connect();
    
    const { id } = await params;
    
    // Проверка валидности ID
    if (!isValidId(id)) {
      return NextResponse.json(
        { error: 'Неверный формат ID товара' },
        { status: 400 }
      );
    }
    
    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Товар не найден' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ product }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при получении товара:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении товара', details: error.message },
      { status: 500 }
    );
  }
}

// PUT запрос для обновления товара
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    await connect();
    
    const { id } = await params;
    const body = await request.json();
    const normalizedImages = normalizeProductImages(body.images);
    if (normalizedImages.images) {
      body.images = normalizedImages.images;
      body.image = normalizedImages.image;
    }
    
    // Проверка валидности ID
    if (!isValidId(id)) {
      return NextResponse.json(
        { error: 'Неверный формат ID товара' },
        { status: 400 }
      );
    }
    
    // Обновляем товар
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );
    
    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Товар не найден' },
        { status: 404 }
      );
    }
    
    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/category', 'layout');
    revalidatePath(`/product/${updatedProduct.slug}`);
    
    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка при обновлении товара:', error);
    
    // Возвращаем более детальную информацию об ошибке валидации
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Ошибка при обновлении товара', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE запрос для удаления товара
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    await connect();
    
    const { id } = await params;
    
    // Проверка валидности ID
    if (!isValidId(id)) {
      return NextResponse.json(
        { error: 'Неверный формат ID товара' },
        { status: 400 }
      );
    }
    
    const deletedProduct = await Product.findByIdAndDelete(id);
    
    if (!deletedProduct) {
      return NextResponse.json(
        { error: 'Товар не найден' },
        { status: 404 }
      );
    }
    
    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/category', 'layout');
    
    return NextResponse.json(
      { message: 'Товар успешно удален' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Ошибка при удалении товара:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении товара', details: error.message },
      { status: 500 }
    );
  }
}
