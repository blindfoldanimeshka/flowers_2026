export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { escapeRegExp, safeSearchTerm, toIntInRange } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

export const GET = withErrorHandler(async (request: NextRequest) => {
    const searchParams = request.nextUrl.searchParams;
    const filterConditions: any = {};

    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      filterConditions.category_id = categoryId;
    }

    const subcategoryId = searchParams.get('subcategoryId');
    if (subcategoryId) {
      filterConditions.subcategory_id = subcategoryId;
    }

    const inStock = searchParams.get('inStock');
    if (inStock !== null) {
      filterConditions.in_stock = inStock === 'true';
    }

    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    const query = safeSearchTerm(searchParams.get('query'));
    
    // Build Supabase query
    let supabaseQuery = supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (categoryId) {
      supabaseQuery = supabaseQuery.or(`category_id.eq.${categoryId},category_ids.cs.{${categoryId}}`);
    }

    if (subcategoryId) {
      supabaseQuery = supabaseQuery.eq('subcategory_id', subcategoryId);
    }

    if (inStock !== null) {
      supabaseQuery = supabaseQuery.eq('in_stock', inStock === 'true');
    }

    if (minPrice) {
      const parsedMinPrice = Number(minPrice);
      if (Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0) {
        supabaseQuery = supabaseQuery.gte('price', parsedMinPrice);
      }
    }

    if (maxPrice) {
      const parsedMaxPrice = Number(maxPrice);
      if (Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0) {
        supabaseQuery = supabaseQuery.lte('price', parsedMaxPrice);
      }
    }

    if (query) {
      const escaped = escapeRegExp(query);
      supabaseQuery = supabaseQuery.or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`);
    }

    // Sorting
    const allowedSortFields = new Set(['created_at', 'price', 'name']);
    const rawSortField = searchParams.get('sortField') || 'created_at';
    const sortField = allowedSortFields.has(rawSortField) ? rawSortField : 'created_at';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? true : false;

    supabaseQuery = supabaseQuery.order(sortField, { ascending: sortOrder });

    // Pagination
    const page = toIntInRange(searchParams.get('page'), 1, 1, 1000);
    const limit = toIntInRange(searchParams.get('limit'), 10, 1, 100);
    const skip = (page - 1) * limit;

    supabaseQuery = supabaseQuery.range(skip, skip + limit - 1);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      productionLogger.error('Supabase product filter error:', error);
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

    return NextResponse.json(
      {
        products,
        pagination: {
          total: count || 0,
          page,
          limit,
          pages: Math.ceil((count || 0) / limit)
        }
      },
      { status: 200 }
    );
});
