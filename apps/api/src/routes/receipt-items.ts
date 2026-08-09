import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  ReceiptItemSchema,
  CreateReceiptItemSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const receiptItemsApp = new OpenAPIHono<AppEnv>();

// GET /v1/receipt-items
const listReceiptItemsRoute = createRoute({
  method: 'get',
  path: '/v1/receipt-items',
  summary: 'Listar Itens de Recibo',
  description: 'Retorna os itens de recibo, opcionalmente filtrados por transação.',
  request: {
    query: z.object({
      transaction_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(ReceiptItemSchema),
        },
      },
      description: 'Itens recuperados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar itens de recibo',
    },
  },
});

receiptItemsApp.openapi(listReceiptItemsRoute, async (c) => {
  const db = getDb(c);
  const { transaction_id } = c.req.valid('query');

  let query = db
    .from('receipt_items')
    .select('*')
    .order('line_number', { ascending: true });

  if (transaction_id) query = query.eq('transaction_id', transaction_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/receipt-items
const createReceiptItemsRoute = createRoute({
  method: 'post',
  path: '/v1/receipt-items',
  summary: 'Criar Itens de Recibo',
  description: 'Insere um ou vários itens de recibo (smart modes de combustível, salgados, etc).',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.array(CreateReceiptItemSchema),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.array(ReceiptItemSchema),
        },
      },
      description: 'Itens criados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar itens de recibo',
    },
  },
});

receiptItemsApp.openapi(createReceiptItemsRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  if (body.length === 0) {
    return c.json([], 201);
  }

  const { data, error } = await db
    .from('receipt_items')
    .insert(body)
    .select();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 201);
});

export default receiptItemsApp;
