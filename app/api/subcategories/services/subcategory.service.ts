import { supabase } from '@/lib/supabase';
import { escapeRegExp } from '@/lib/security';
import { productionLogger } from '@/lib/productionLogger';

export interface CreateSubcategoryParams {
  name: string;
  categoryId: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateSubcategoryParams {
  subcategoryId: string;
  name?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  categoryId?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\\s+/g, '-')
    .replace(/[^\\w\\-]+/g, '')
    .replace(/\\-\\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function mapSupabaseSubcategory(sub: any) {
  return {
    _id: sub.id,
    id: sub.id,
    name: sub.name,
    slug: sub.slug,
    categoryId: sub.category_id,
    description: sub.description,
    image: sub.image,
    isActive: sub.is_active ?? true,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
  };
}

export const SubcategoryService = {
  async createSubcategory({
    name,
    categoryId,
    description,
    image,
    isActive = true,
  }: CreateSubcategoryParams) {
    try {
      // Check if category exists
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', categoryId)
        .single();

      if (categoryError || !category) {
        throw new Error('Category not found');
      }

      // Check for existing subcategory with same name in this category
      const { data: existingSubcategory } = await supabase
        .from('subcategories')
        .select('id')
        .eq('category_id', categoryId)
        .ilike('name', name)
        .maybeSingle();

      if (existingSubcategory) {
        throw new Error('Subcategory with this name already exists in the category');
      }

      // Generate slug
      const slug = generateSlug(name);

      // Create new subcategory
      const { data: savedSubcategory, error: createError } = await supabase
        .from('subcategories')
        .insert({
          name,
          slug,
          category_id: categoryId,
          description,
          image,
          is_active: isActive,
        })
        .select('*')
        .single();

      if (createError || !savedSubcategory) {
        throw new Error(`Failed to create subcategory: ${createError?.message}`);
      }

      return mapSupabaseSubcategory(savedSubcategory);
    } catch (error) {
      productionLogger.error('[SUBCATEGORY SERVICE] Error in createSubcategory', error as Error);
      throw error;
    }
  },

  async getSubcategoryById(id: string) {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*, categories(name)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return mapSupabaseSubcategory(data);
  },

  async getSubcategoryBySlug(slug: string) {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*, categories(name)')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !data) return null;
    return mapSupabaseSubcategory(data);
  },

  async getAllSubcategories(categoryId?: string) {
    let query = supabase
      .from('subcategories')
      .select('*, categories(name)')
      .order('name', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapSupabaseSubcategory);
  },

  async updateSubcategory({
    subcategoryId,
    name,
    description,
    image,
    isActive,
    categoryId,
  }: UpdateSubcategoryParams) {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (name !== undefined) {
        updateData.name = name;
        updateData.slug = generateSlug(name);
      }
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data: updated, error } = await supabase
        .from('subcategories')
        .update(updateData)
        .eq('id', subcategoryId)
        .select('*, categories(name)')
        .single();

      if (error || !updated) {
        throw new Error(`Failed to update subcategory: ${error?.message}`);
      }

      // If category changed, we need to handle the reference
      // Note: In Supabase, we don't have arrays of references like Mongoose
      // The category_id field on subcategory is the source of truth

      return mapSupabaseSubcategory(updated);
    } catch (error) {
      productionLogger.error('[SUBCATEGORY SERVICE] Error in updateSubcategory', error as Error);
      throw error;
    }
  },

  async deleteSubcategory(id: string) {
    productionLogger.info('[SUBCATEGORY SERVICE] Deleting subcategory:', id);
    
    const { data: deleted, error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      productionLogger.error('[SUBCATEGORY SERVICE] Delete error:', error);
      return null;
    }

    if (deleted) {
      productionLogger.info('[SUBCATEGORY SERVICE] ✅ Subcategory deleted');
    }

    return deleted;
  },
};
