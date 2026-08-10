import { z } from '@hono/zod-openapi';
import { isoDate } from './common.js';

// ----------------------------------------------------
// Metas (colunas reais do banco)
// ----------------------------------------------------
export const GoalSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string().openapi({ example: 'Viagem de Fim de Ano' }),
  target_amount: z.number().openapi({ example: 5000.0 }),
  current_amount: z.number().openapi({ example: 2100.0 }),
  deadline: isoDate().nullable().optional().openapi({ example: '2026-12-31' }),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  status: z.string().optional(),
  created_at: z.string().optional(),
}).openapi('Goal');

export const CreateGoalSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  target_amount: z.number().positive(),
  deadline: isoDate().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
}).openapi('CreateGoal');

export const UpdateGoalSchema = z.object({
  name: z.string().optional(),
  target_amount: z.number().optional(),
  current_amount: z.number().optional(),
  deadline: isoDate().nullable().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
}).openapi('UpdateGoal');
