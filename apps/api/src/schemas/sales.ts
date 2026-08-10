import { z } from '@hono/zod-openapi';
import { isoDate, isoTime, ProductRefSchema } from './common.js';

// ----------------------------------------------------
// Vendas
// ----------------------------------------------------
export const SaleSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  cost_price: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  sale_date: isoDate(),
  sale_time: isoTime().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  products: ProductRefSchema,
}).openapi('Sale');

export const CreateSaleSchema = z.object({
  family_id: z.string().uuid(),
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_price: z.number(),
  total_price: z.number(),
  cost_price: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  sale_date: isoDate(),
  sale_time: isoTime().nullable().optional(),
  customer_name: z.string().nullable().optional(),
}).openapi('CreateSale');

export const UpdateSaleSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  quantity: z.number().positive().optional(),
  unit_price: z.number().optional(),
  total_price: z.number().optional(),
  cost_price: z.number().nullable().optional(),
  profit: z.number().nullable().optional(),
  sale_date: isoDate().optional(),
  sale_time: isoTime().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
}).openapi('UpdateSale');
