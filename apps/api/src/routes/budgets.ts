import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  BudgetSchema,
  CreateBudgetSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const budgetsApp = new OpenAPIHono<AppEnv>();

// GET /v1/budgets
const listBudgetsRoute = createRoute({
  method: 'get',
  path: '/v1/budgets',
  summary: 'Listar Orçamentos',
  description: 'Retorna os orçamentos da família, com os dados da categoria.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(BudgetSchema),
        },
      },
      description: 'Orçamentos recuperados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar orçamentos',
    },
  },
});

budgetsApp.openapi(listBudgetsRoute, async (c) => {
  const db = getDb(c);
  const { family_id } = c.req.valid('query');

  let query = db
    .from('budgets')
    .select('*, categories(name, color)')
    .order('created_at', { ascending: false });
  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/budgets
const createBudgetRoute = createRoute({
  method: 'post',
  path: '/v1/budgets',
  summary: 'Criar Orçamento',
  description: 'Define um limite de gasto por categoria para a família.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateBudgetSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: BudgetSchema,
        },
      },
      description: 'Orçamento criado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar orçamento',
    },
  },
});

budgetsApp.openapi(createBudgetRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('budgets')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// DELETE /v1/budgets/:id
const deleteBudgetRoute = createRoute({
  method: 'delete',
  path: '/v1/budgets/{id}',
  summary: 'Remover Orçamento',
  description: 'Exclui um orçamento pelo seu UUID.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Orçamento removido com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar orçamento',
    },
  },
});

budgetsApp.openapi(deleteBudgetRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Orçamento ${id} removido` }, 200);
});

export default budgetsApp;
