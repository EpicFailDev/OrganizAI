import { z } from '@hono/zod-openapi';
import {
  isoDate,
  isoTime,
  CategoryRefSchema,
  SubcategoryRefSchema,
  ProfileRefSchema,
} from './common.js';
import { ReceiptItemSchema } from './receipt.js';

// ----------------------------------------------------
// Transação (Despesa / Receita)
// ----------------------------------------------------
// O banco só aceita 'expense' e 'income' (CHECK constraint da tabela).
export const TransactionTypeSchema = z.enum(['expense', 'income']).openapi('TransactionType');

// Colunas reais de public.transactions:
// id, family_id, date, description, category_id, subcategory_id, type,
// amount, created_by, attachment_url, created_at, time
export const TransactionSchema = z.object({
  id: z.string().uuid().openapi({ example: 'e3b0c442-98fc-11ee-b9d1-0242ac120002' }),
  family_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  date: isoDate().openapi({ example: '2026-08-08' }),
  description: z.string().openapi({ example: 'Supermercado Mensal' }),
  category_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  subcategory_id: z.string().uuid().nullable().optional(),
  type: TransactionTypeSchema,
  amount: z.number().openapi({ example: 450.75 }),
  created_by: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000002' }),
  attachment_url: z.string().nullable().optional(),
  time: isoTime().nullable().optional().openapi({ example: '14:30:00' }),
  created_at: z.string().optional(),
}).openapi('Transaction');

export const CreateTransactionSchema = z.object({
  family_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  description: z.string().min(1, 'Descrição é obrigatória').openapi({ example: 'Almoço de Domingo' }),
  amount: z.number().positive('O valor deve ser maior que zero').openapi({ example: 89.90 }),
  type: TransactionTypeSchema.default('expense'),
  category_id: z.string().uuid().openapi({ example: 'a1b2c3d4-0000-0000-0000-000000000001' }),
  subcategory_id: z.string().uuid().nullable().optional(),
  date: isoDate().openapi({ example: '2026-08-08' }),
  time: isoTime().nullable().optional().openapi({ example: '14:30:00' }),
  attachment_url: z.string().nullable().optional(),
}).openapi('CreateTransaction');

export const UpdateTransactionSchema = z.object({
  date: isoDate().optional(),
  time: isoTime().nullable().optional(),
  description: z.string().optional(),
  amount: z.number().positive('O valor deve ser maior que zero').optional(),
  type: TransactionTypeSchema.optional(),
  category_id: z.string().uuid().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  attachment_url: z.string().nullable().optional(),
}).openapi('UpdateTransaction');

export const TransactionListItemSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  date: isoDate(),
  description: z.string(),
  category_id: z.string().uuid().nullable().optional(),
  subcategory_id: z.string().uuid().nullable().optional(),
  type: TransactionTypeSchema,
  amount: z.number(),
  created_by: z.string().uuid(),
  attachment_url: z.string().nullable().optional(),
  time: isoTime().nullable().optional(),
  created_at: z.string().optional(),
  categories: CategoryRefSchema,
  subcategories: SubcategoryRefSchema,
  profiles: ProfileRefSchema,
  receipt_items: z.array(ReceiptItemSchema).optional(),
}).openapi('TransactionListItem');
