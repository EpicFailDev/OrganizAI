import { z } from '@hono/zod-openapi';

// Itens de recibo (referenciados pela listagem de transações e expostos na
// rota /v1/receipt-items).
export const ReceiptItemSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  family_id: z.string().uuid(),
  item_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  line_number: z.number().nullable().optional(),
  created_at: z.string().optional(),
}).openapi('ReceiptItem');

export const CreateReceiptItemSchema = z.object({
  transaction_id: z.string().uuid(),
  family_id: z.string().uuid(),
  item_name: z.string(),
  quantity: z.number().optional().default(1),
  unit_price: z.number().optional().default(0),
  total_price: z.number().optional().default(0),
  line_number: z.number().nullable().optional(),
}).openapi('CreateReceiptItem');
