import { z } from '@hono/zod-openapi';
import { isoDate, CategoryRefSchema } from './common.js';

// ----------------------------------------------------
// Planejamento
// ----------------------------------------------------
export const PlanningItemSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  description: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category_id: z.string().uuid().nullable().optional(),
  expected_date: isoDate(),
  recurring: z.boolean().optional(),
  recurring_pattern: z.string().nullable().optional(),
  status: z.string().optional(),
  created_by: z.string().uuid().optional(),
  created_at: z.string().optional(),
  categories: CategoryRefSchema,
}).openapi('PlanningItem');

export const CreatePlanningItemSchema = z.object({
  family_id: z.string().uuid(),
  description: z.string().min(1),
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category_id: z.string().uuid().nullable().optional(),
  expected_date: isoDate(),
  recurring: z.boolean().optional().default(false),
  recurring_pattern: z.string().nullable().optional(),
}).openapi('CreatePlanningItem');

export const UpdatePlanningItemSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
  expected_date: isoDate().optional(),
}).openapi('UpdatePlanningItem');
