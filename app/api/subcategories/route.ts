export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import connect from '@/lib/db';
import Subcategory from '@/models/Subcategory';
import slugify from 'slugify';
import Category from '@/models/Category';
import { invalidateCategoriesCache, invalidateSubcategoriesCache } from '@/lib/cache';
import { isValidId } from '@/lib/id';
import { escapeRegExp, sanitizeMongoObject } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';
import { withErrorHandler } from '@/lib/errorHandler';

// GET all subcategories
export const GET = withErrorHandler(async (request: NextRequest) => {
    await connect();

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const categoryId = searchParams.get('categoryId');
    const categoryNumId = searchParams.get('categoryNumId');

    const query: Record<string, string | number> = {};
    if (slug) query.slug = slug;
    if (categoryId) query.categoryId = categoryId;
    if (categoryNumId) {
      const parsedCategoryNumId = Number.parseInt(categoryNumId, 10);
      if (!Number.isNaN(parsedCategoryNumId)) {
        query.categoryNumId = parsedCategoryNumId;
      }
    }

    if (slug) {
      const subcategory = await Subcategory.findOne(query).lean();
      if (!subcategory) {
        return NextResponse.json(
          { success: false, error: 'РџРѕРґРєР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°' },
          { status: 404 }
        );
      }

      return NextResponse.json(subcategory);
    }

    const subcategories = await Subcategory.find(query).lean();
    return NextResponse.json({ success: true, data: subcategories });
  
});

// POST a new subcategory
export const POST = withErrorHandler(async (request: NextRequest) => {
    await connect();
    
    const body = sanitizeMongoObject(await request.json());
    const { name, categoryId, description, image, isActive } = body;
    
    productionLogger.info('[SUBCATEGORY API] Creating subcategory:', { name, categoryId });
    
    if (!name || !categoryId) {
      return NextResponse.json(
        { success: false, error: 'РќР°Р·РІР°РЅРёРµ Рё ID РєР°С‚РµРіРѕСЂРёРё РѕР±СЏР·Р°С‚РµР»СЊРЅС‹' },
        { status: 400 }
      );
    }
    
    if (!isValidId(categoryId)) {
      return NextResponse.json(
        { success: false, error: 'РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ ID РєР°С‚РµРіРѕСЂРёРё' },
        { status: 400 }
      );
    }
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'РЈРєР°Р·Р°РЅРЅР°СЏ РєР°С‚РµРіРѕСЂРёСЏ РЅРµ РЅР°Р№РґРµРЅР°' },
        { status: 404 }
      );
    }
    
    productionLogger.info('[SUBCATEGORY API] Found category:', { 
      _id: String(category._id),
      id: category.id,
      name: category.name, 
      subcategories: Array.isArray(category.subcategories) ? category.subcategories.map((id: any) => String(id)) : 'not an array'
    });
    
    const existingSubcategory = await Subcategory.findOne({
      name: { $regex: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i') },
      categoryId
    });
    
    if (existingSubcategory) {
      return NextResponse.json(
        { success: false, error: 'РџРѕРґРєР°С‚РµРіРѕСЂРёСЏ СЃ С‚Р°РєРёРј РЅР°Р·РІР°РЅРёРµРј СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚ РІ СЌС‚РѕР№ РєР°С‚РµРіРѕСЂРёРё' },
        { status: 409 }
      );
    }
    
    let slug = slugify(name, { lower: true, strict: true });
    let counter = 1;
    while (await Subcategory.exists({ slug })) {
      slug = `${slugify(name, { lower: true, strict: true })}-${counter++}`;
    }
    
    try {
      // РЎРѕР·РґР°РµРј РѕР±СЉРµРєС‚ РїРѕРґРєР°С‚РµРіРѕСЂРёРё
      const subcategoryData = {
        name: name.trim(),
        slug,
        categoryId,
        categoryNumId: category.id,
        description: description || '',
        image: image || '',
        isActive: isActive !== undefined ? isActive : true
      };
      
      productionLogger.info('[SUBCATEGORY API] Creating subcategory with data:', subcategoryData);
      
      // РЎРѕР·РґР°РµРј РЅРѕРІСѓСЋ РїРѕРґРєР°С‚РµРіРѕСЂРёСЋ
      const newSubcategory = new Subcategory(subcategoryData);
      
      // РџСЂРѕРІРµСЂСЏРµРј РІР°Р»РёРґРЅРѕСЃС‚СЊ РјРѕРґРµР»Рё
      const validationError = newSubcategory.validateSync();
      if (validationError) {
        return NextResponse.json(
          { success: false, error: 'РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё РґР°РЅРЅС‹С…', details: validationError.message },
          { status: 400 }
        );
      }
      
      // РЎРѕС…СЂР°РЅСЏРµРј РїРѕРґРєР°С‚РµРіРѕСЂРёСЋ
      const savedSubcategory = await newSubcategory.save();
      productionLogger.info('[SUBCATEGORY API] Saved new subcategory:', {
        _id: savedSubcategory._id.toString(),
        name: savedSubcategory.name,
        categoryId: savedSubcategory.categoryId.toString(),
        categoryNumId: savedSubcategory.categoryNumId
      });
      
      // РћР±РЅРѕРІР»СЏРµРј РєР°С‚РµРіРѕСЂРёСЋ, РёСЃРїРѕР»СЊР·СѓСЏ $addToSet РґР»СЏ РґРѕР±Р°РІР»РµРЅРёСЏ ID РїРѕРґРєР°С‚РµРіРѕСЂРёРё
      productionLogger.info('[SUBCATEGORY API] Updating category with subcategory ID:', savedSubcategory._id.toString());
      
      const updateResult = await Category.findByIdAndUpdate(
        categoryId,
        { $addToSet: { subcategories: savedSubcategory._id } },
        { new: true }
      );
      
      productionLogger.info('[SUBCATEGORY API] Category update result:', {
        modifiedCount: updateResult ? 1 : 0,
        subcategories: updateResult ? updateResult.subcategories.map(id => id.toString()) : 'failed'
      });
      
      if (!updateResult) {
        productionLogger.warn('[SUBCATEGORY API] Failed to update category after subcategory save', {
          categoryId,
          subcategoryId: savedSubcategory._id?.toString?.(),
        });
        return NextResponse.json(
          { success: false, error: 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ РєР°С‚РµРіРѕСЂРёСЋ' },
          { status: 500 }
        );
      }
      
      productionLogger.info('[SUBCATEGORY API] вњ… SUCCESS: Category updated successfully with subcategory');
      
      // РћРїС‚РёРјРёР·РёСЂРѕРІР°РЅРЅР°СЏ РёРЅРІР°Р»РёРґР°С†РёСЏ РєСЌС€Р° - С‚РѕР»СЊРєРѕ С‚Рѕ С‡С‚Рѕ РЅСѓР¶РЅРѕ
      try {
        productionLogger.info('[SUBCATEGORY API] Invalidating cache...');
        
        // РРЅРІР°Р»РёРґРёСЂСѓРµРј С‚РѕР»СЊРєРѕ РєСЌС€ РєР°С‚РµРіРѕСЂРёР№ (РїРѕРґРєР°С‚РµРіРѕСЂРёРё РІРєР»СЋС‡РµРЅС‹ РІ РєР°С‚РµРіРѕСЂРёРё)
        invalidateCategoriesCache();
        productionLogger.info('[SUBCATEGORY API] Categories cache invalidated');
        
        // РРЅРІР°Р»РёРґРёСЂСѓРµРј РєСЌС€ РїРѕРґРєР°С‚РµРіРѕСЂРёР№ РѕС‚РґРµР»СЊРЅРѕ РґР»СЏ РґСЂСѓРіРёС… endpoint'РѕРІ
        invalidateSubcategoriesCache();
        productionLogger.info('[SUBCATEGORY API] Subcategories cache invalidated');
        
        // РџРµСЂРµР·Р°РіСЂСѓР¶Р°РµРј С‚РѕР»СЊРєРѕ РЅРµРѕР±С…РѕРґРёРјС‹Рµ РїСѓС‚Рё
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/admin/categories');
        revalidatePath(`/category/${category.slug}`);
        productionLogger.info('[SUBCATEGORY API] Essential paths revalidated');
      } catch (cacheError) {
        productionLogger.warn('[SUBCATEGORY API] Error invalidating cache', { cacheError });
        // РќРµ РїСЂРµСЂС‹РІР°РµРј РІС‹РїРѕР»РЅРµРЅРёРµ РёР·-Р·Р° РѕС€РёР±РєРё РєСЌС€Р°
      }
      
      productionLogger.info('[SUBCATEGORY API] Subcategory created successfully', savedSubcategory);
      
      return NextResponse.json({ success: true, data: savedSubcategory }, { status: 201 });
    } catch (error) {
      if (error instanceof Error) {
        
        // РџСЂРѕРІРµСЂСЏРµРј, СЏРІР»СЏРµС‚СЃСЏ Р»Рё РѕС€РёР±РєР° РѕС€РёР±РєРѕР№ РІР°Р»РёРґР°С†РёРё MongoDB
        if (error.name === 'ValidationError') {
          const validationErrors = Object.values((error as any).errors || {}).map(
            (err: any) => err.message || 'РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё'
          );
          return NextResponse.json(
            { success: false, error: 'РћС€РёР±РєР° РІР°Р»РёРґР°С†РёРё РґР°РЅРЅС‹С…', details: validationErrors.join(', ') },
            { status: 400 }
          );
        }
        
        // РџСЂРѕРІРµСЂСЏРµРј, СЏРІР»СЏРµС‚СЃСЏ Р»Рё РѕС€РёР±РєР° РѕС€РёР±РєРѕР№ РґСѓР±Р»РёСЂРѕРІР°РЅРёСЏ
        if ((error as any).code === 11000) {
          return NextResponse.json(
            { success: false, error: 'Р”СѓР±Р»РёСЂРѕРІР°РЅРёРµ СѓРЅРёРєР°Р»СЊРЅРѕРіРѕ РїРѕР»СЏ', details: error.message },
            { status: 409 }
          );
        }
      }
      throw error;
    }
  
});

