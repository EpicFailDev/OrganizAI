import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  SaleSchema,
  CreateSaleSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const salesApp = new OpenAPIHono<AppEnv>();

// GET /v1/sales
const listSalesRoute = createRoute({
  method: 'get',
  path: '/v1/sales',
  summary: 'Listar Vendas',
  description: 'Retorna as vendas da família, com o nome do produto.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
      from: z.coerce.number().int().min(0).optional().default(0),
      limit: z.coerce.number().int().min(1).max(1000).optional().default(1000),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(SaleSchema),
        },
      },
      description: 'Vendas recuperadas com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar vendas',
    },
  },
});

salesApp.openapi(listSalesRoute, async (c) => {
  const db = getDb(c);
  const { family_id, from, limit } = c.req.valid('query');

  let query = db
    .from('sales')
    .select('*, products(name)')
    .order('sale_date', { ascending: false })
    .range(from, from + limit - 1);

  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/sales
const createSaleRoute = createRoute({
  method: 'post',
  path: '/v1/sales',
  summary: 'Criar Venda',
  description: 'Registra uma nova venda.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSaleSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SaleSchema,
        },
      },
      description: 'Venda registrada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao registrar venda',
    },
  },
});

salesApp.openapi(createSaleRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('sales')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

export default salesApp;
