export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Category from '@/models/Category';
import { invalidateCategoriesCache } from '@/lib/cache';
import { requireAdmin } from '@/lib/auth';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const POST = withErrorHandler(async (request: NextRequest) => {
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
    }

    await connect();
    const body = await request.json();
    const { categoryIds } = body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ error: 'Некорректный массив категорий' }, { status: 400 });
    }

    // Обновляем порядок для каждой категории
    const updatePromises = categoryIds.map((id, index) =>
      Category.findByIdAndUpdate(id, { $set: { order: index } }, { new: true })
    );

    await Promise.all(updatePromises);
    invalidateCategoriesCache();

    return NextResponse.json({ success: true });
  
});
