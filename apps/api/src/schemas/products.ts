import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Produtos
// ----------------------------------------------------
export const ProductSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  recipe_id: z.string().uuid().nullable().optional(),
  selling_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  active: z.boolean().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
}).openapi('Product');

export const CreateProductSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  selling_price: z.number().nullable().optional(),
  unit: z.string().optional().default('un'),
}).openapi('CreateProduct');

export const UpdateProductSchema = z.object({
  name: z.string().optional(),
  selling_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  unit: z.string().optional(),
  active: z.boolean().optional(),
}).openapi('UpdateProduct');
