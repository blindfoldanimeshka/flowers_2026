export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { escapeRegExp, safeSearchTerm } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const query = safeSearchTerm(searchParams.get('query'));

    if (!query) {
      return NextResponse.json(
        { error: 'Поисковый запрос не указан' },
        { status: 400 }
      );
    }

    const escaped = escapeRegExp(query);

    // Use Supabase full-text search or ILIKE for search
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);

    if (error) {
      productionLogger.error('Supabase product search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const products = (data || []).map((product: any) => ({
      _id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      oldPrice: product.old_price,
      image: product.image_url || '',
      inStock: product.in_stock,
      categoryId: product.category_id || '',
      subcategoryId: product.subcategory_id || '',
    }));

    return NextResponse.json({ products }, { status: 200 });
});
