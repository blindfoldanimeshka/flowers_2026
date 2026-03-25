import { z } from 'zod';
import { Logger } from '@/lib/logger';

export const subcategorySchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа')
    .max(100, 'Название не может быть длиннее 100 символов'),
  categoryId: z.string().min(1).refine((val) => val.trim().length > 0, {
    message: 'Неверный формат ID категории',
  }),
  description: z.string().max(500, 'Описание не может быть длиннее 500 символов').optional(),
  image: z.string().url('Некорректный URL изображения').optional(),
  isActive: z.boolean().optional().default(true),
});

export const validateSubcategoryData = (data: unknown) => {
  try {
    return subcategorySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      Logger.warn('Validation failed', { errors });
      throw { validationError: true, errors };
    }
    throw error;
  }
};

export const validateObjectId = (id: string) => {
  if (!id || id.trim().length === 0) {
    throw new Error('Неверный формат ID');
  }
  return true;
};
