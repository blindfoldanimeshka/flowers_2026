import Subcategory, { ISubcategory } from '@/models/Subcategory';
import Category from '@/models/Category';
import { Logger } from '@/lib/logger';
import { escapeRegExp } from '@/lib/security';

export interface CreateSubcategoryParams {
  name: string;
  categoryId: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  session?: any;
}

export interface UpdateSubcategoryParams extends Partial<CreateSubcategoryParams> {
  subcategoryId: string;
}

export const SubcategoryService = {
  async createSubcategory({
    name,
    categoryId,
    description,
    image,
    isActive = true,
    session
  }: CreateSubcategoryParams) {
    try {
      // Check if category exists
      const category = await Category.findById(categoryId).session(session || null);
      if (!category) {
        throw new Error('Category not found');
      }

      // Check for existing subcategory with same name in this category
      const existingSubcategory = await Subcategory.findOne({
        name: { $regex: new RegExp(`^${escapeRegExp(name)}$`, 'i') },
        categoryId
      }).session(session || null);

      if (existingSubcategory) {
        throw new Error('Subcategory with this name already exists in the category');
      }

      // Generate slug
      const slug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

      // Create new subcategory
      const newSubcategory = new Subcategory({
        name,
        slug,
        categoryId,
        description,
        image,
        isActive
      });

      // Save subcategory
      const savedSubcategory = await newSubcategory.save({ session });

      // Add subcategory to category's subcategories array
      await Category.findByIdAndUpdate(
        categoryId,
        { $addToSet: { subcategories: savedSubcategory._id } },
        { session, new: true }
      );

      return savedSubcategory;
    } catch (error) {
      Logger.error('Error in createSubcategory', error as Error);
      throw error;
    }
  },

  async getSubcategoryById(id: string) {
    return Subcategory.findById(id).populate('categoryId', 'name');
  },

  async getSubcategoryBySlug(slug: string) {
    return Subcategory.findOne({ slug }).populate('categoryId', 'name');
  },

  async getAllSubcategories(categoryId?: string) {
    const query = categoryId ? { categoryId } : {};
    return Subcategory.find(query)
      .populate('categoryId', 'name')
      .sort({ name: 1 });
  },

  async updateSubcategory({
    subcategoryId,
    name,
    description,
    image,
    isActive,
    categoryId,
    session
  }: UpdateSubcategoryParams) {
    const updateData: Partial<ISubcategory> = {};
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (categoryId) {
      // Convert string to ObjectId if necessary
      updateData.categoryId = categoryId;
    }
    
    updateData.updatedAt = new Date().toISOString();

    const updated = await Subcategory.findByIdAndUpdate(
      subcategoryId,
      updateData,
      { new: true, session }
    );

    if (categoryId && updated) {
      // Update category references if category was changed
      await Category.updateMany(
        { subcategories: updated._id },
        { $pull: { subcategories: updated._id } },
        { session }
      );
      
      await Category.findByIdAndUpdate(
        categoryId,
        { $addToSet: { subcategories: updated._id } },
        { session, new: true }
      );
    }

    return updated;
  },

  async deleteSubcategory(id: string) {
    console.log('[SUBCATEGORY SERVICE] Deleting subcategory:', id);
    
    const deleted = await Subcategory.findByIdAndDelete(id);
    
    if (deleted) {
      console.log('[SUBCATEGORY SERVICE] Removing subcategory reference from categories');
      await Category.updateMany(
        { subcategories: deleted._id },
        { $pull: { subcategories: deleted._id } }
      );
      console.log('[SUBCATEGORY SERVICE] ✅ Subcategory deleted and references removed');
    }
    
    return deleted;
  }
};
