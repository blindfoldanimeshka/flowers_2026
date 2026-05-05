import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

type CategorySubcategoriesRouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (_request: NextRequest, { params }: CategorySubcategoriesRouteContext) => {
    const { id } = await params;

    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (catError || !category) {
      productionLogger.error('Supabase category fetch error:', catError);
      return NextResponse.json(
        { error: 'Категория не найдена' },
        { status: 404 }
      );
    }
    
    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('id, legacy_id, category_id, name, slug, created_at, updated_at')
      .eq('category_id', id)
      .order('name', { ascending: true });

    if (subError) {
      productionLogger.error('Supabase subcategories fetch error:', subError);
      return NextResponse.json(
        { error: 'Ошибка получения подкатегорий' },
        { status: 500 }
      );
    }
    
    const subcategoryList = (subcategories || []).map((row) => ({
      _id: row.id,
      id: row.id,
      legacyId: row.legacy_id,
      categoryId: row.category_id,
      name: row.name,
      slug: row.slug,
      isActive: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ subcategories: subcategoryList }, { status: 200 });
  });

export const POST = withErrorHandler(async (_request: NextRequest, { params }: CategorySubcategoriesRouteContext) => {
  const { id } = await params;
  return NextResponse.json(
    {
      error: 'Этот API-маршрут устарел. Используйте POST /api/subcategories с параметром categoryId в теле запроса.',
      redirect_to: '/api/subcategories',
      example: {
        url: '/api/subcategories',
        method: 'POST',
        body: {
          name: 'Название подкатегории',
          categoryId: id,
          description: 'Описание (необязательно)',
          image: 'URL изображения (необязательно)',
          isActive: true
        }
      }
    },
    { status: 301 }
  );
});

export const PUT = withErrorHandler(async (_request: NextRequest, _params: CategorySubcategoriesRouteContext) => {
  return NextResponse.json(
    {
      error: 'Этот API-маршрут не поддерживается. Используйте PUT /api/subcategories/[subcategoryId] для обновления отдельной подкатегории.',
      redirect_to: '/api/subcategories/[subcategoryId]'
    },
    { status: 405 }
  );
});

