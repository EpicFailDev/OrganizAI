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

// ----------------------------------------------------
// Calculadora de Preços (Ficha Técnica de Produtos)
// ----------------------------------------------------
export const ProductPricingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: 'Bolo de Pote Ninho com Nutella' }),
  labor_hours: z.number().openapi({ example: 1.5 }),
  hourly_rate: z.number().openapi({ example: 25.0 }),
  desired_margin_percent: z.number().openapi({ example: 40.0 }),
  final_price: z.number().openapi({ example: 18.50 }),
  cost_total: z.number().openapi({ example: 8.20 }),
}).openapi('ProductPricing');
