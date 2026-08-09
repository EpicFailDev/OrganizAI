import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  TransactionListItemSchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const transactionsApp = new OpenAPIHono<AppEnv>();

// GET /v1/transactions
const listTransactionsRoute = createRoute({
  method: 'get',
  path: '/v1/transactions',
  summary: 'Listar Transações',
  description: 'Retorna a lista de lançamentos financeiros (despesas e receitas), com categorias, subcategorias, perfis e itens de recibo.',
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
          schema: z.array(TransactionListItemSchema),
        },
      },
      description: 'Lista de transações recuperada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro interno ao consultar o banco de dados',
    },
  },
});

transactionsApp.openapi(listTransactionsRoute, async (c) => {
  const db = getDb(c);
  const { family_id, from, limit } = c.req.valid('query');

  let query = db
    .from('transactions')
    .select('*, categories(name, color), subcategories(name), profiles(display_name), receipt_items(*)')
    .order('date', { ascending: false })
    .range(from, from + limit - 1);

  if (family_id) {
    query = query.eq('family_id', family_id);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/transactions
const createTransactionRoute = createRoute({
  method: 'post',
  path: '/v1/transactions',
  summary: 'Criar Nova Transação',
  description: 'Cadastra uma nova receita, despesa ou transferência.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateTransactionSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
      description: 'Transação cadastrada com sucesso',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Dados de entrada inválidos',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao inserir transação',
    },
  },
});

transactionsApp.openapi(createTransactionRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('transactions')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// PATCH /v1/transactions/:id
const updateTransactionRoute = createRoute({
  method: 'patch',
  path: '/v1/transactions/{id}',
  summary: 'Atualizar Transação',
  description: 'Atualiza os campos de uma transação existente pelo seu UUID.',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ example: 'e3b0c442-98fc-11ee-b9d1-0242ac120002' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTransactionSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
      description: 'Transação atualizada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar transação',
    },
  },
});

transactionsApp.openapi(updateTransactionRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('transactions')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// DELETE /v1/transactions/:id
const deleteTransactionRoute = createRoute({
  method: 'delete',
  path: '/v1/transactions/{id}',
  summary: 'Remover Transação',
  description: 'Exclui uma transação existente pelo seu UUID.',
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ example: 'e3b0c442-98fc-11ee-b9d1-0242ac120002' }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Transação removida com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar transação',
    },
  },
});

transactionsApp.openapi(deleteTransactionRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Transação ${id} removida` }, 200);
});

export default transactionsApp;
