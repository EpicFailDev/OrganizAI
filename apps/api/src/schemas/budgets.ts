import { z } from '@hono/zod-openapi';
import { CategoryRefSchema } from './common.js';

// ----------------------------------------------------
// Orçamentos (colunas reais do banco)
// ----------------------------------------------------
export const BudgetSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  category_id: z.string().uuid(),
  limit_amount: z.number().openapi({ example: 1500.0 }),
  period: z.string().optional().default('monthly'),
  created_at: z.string().optional(),
  categories: CategoryRefSchema,
}).openapi('Budget');

export const CreateBudgetSchema = z.object({
  family_id: z.string().uuid(),
  category_id: z.string().uuid(),
  limit_amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'yearly']).optional().default('monthly'),
}).openapi('CreateBudget');
