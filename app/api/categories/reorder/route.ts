export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateCategoriesCache } from '@/lib/cache';
import { requireAdmin } from '@/lib/auth';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const POST = withErrorHandler(async (request: NextRequest) => {
    const auth = await requireAdmin(request);
    if (!auth.success) {
      return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 401 });
    }

    const body = await request.json();
    const { categoryIds } = body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ error: 'Некорректный массив категорий' }, { status: 400 });
    }

    // Обновляем порядок для каждой категории
    const updatePromises = categoryIds.map((id: string, index: number) =>
      supabase
        .from('categories')
        .update({ legacy_id: index })
        .eq('id', id)
    );

    const results = await Promise.all(updatePromises);
    
    // Проверяем на ошибки
    const hasError = results.some(result => result.error);
    if (hasError) {
      productionLogger.error('[CATEGORIES REORDER] Error updating order');
      return NextResponse.json({ error: 'Ошибка обновления порядка' }, { status: 500 });
    }

    invalidateCategoriesCache();

    return NextResponse.json({ success: true });
});
