import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Categoria
// ----------------------------------------------------
// Colunas reais de public.categories:
// id, family_id, name, type, color, icon, created_at
export const CategorySchema = z.object({
  id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  name: z.string().openapi({ example: 'Alimentação' }),
  icon: z.string().nullable().optional().openapi({ example: 'Utensils' }),
  color: z.string().nullable().optional().openapi({ example: '#EF4444' }),
  type: z.enum(['income', 'expense']).openapi({ example: 'expense' }),
  family_id: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('Category');

export const CreateCategorySchema = z.object({
  name: z.string().min(1).openapi({ example: 'Supermercado' }),
  type: z.enum(['income', 'expense']).default('expense'),
  color: z.string().optional(),
  icon: z.string().optional(),
  family_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
}).openapi('CreateCategory');

// ----------------------------------------------------
// Subcategoria
// ----------------------------------------------------
export const SubcategorySchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string(),
  created_at: z.string().optional(),
}).openapi('Subcategory');

export const CreateSubcategorySchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1),
}).openapi('CreateSubcategory');
