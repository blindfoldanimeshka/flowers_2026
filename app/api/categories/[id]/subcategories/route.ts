import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not configured');
  }

  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

type CategorySubcategoriesRouteContext = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (_request: NextRequest, { params }: CategorySubcategoriesRouteContext) => {
    const supabase = createSupabaseClient();
    const { id } = await params;
    
    const { data: category, error: catError } = await supabase
      .from('documents')
      .select('id, doc')
      .eq('collection', 2) // categories = 2
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
      .from('documents')
      .select('id, doc')
      .eq('collection', 3) // subcategories = 3
      .eq('doc->>categoryId', id);
    
    if (subError) {
      productionLogger.error('Supabase subcategories fetch error:', subError);
      return NextResponse.json(
        { error: 'Ошибка получения подкатегорий' },
        { status: 500 }
      );
    }
    
    const subcategoryList = (subcategories || []).map(row => ({
      _id: row.id,
      ...JSON.parse(row.doc),
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

