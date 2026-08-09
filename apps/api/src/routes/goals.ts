import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  GoalSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const goalsApp = new OpenAPIHono<AppEnv>();

// GET /v1/goals
const listGoalsRoute = createRoute({
  method: 'get',
  path: '/v1/goals',
  summary: 'Listar Metas',
  description: 'Retorna as metas financeiras da família.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(GoalSchema),
        },
      },
      description: 'Metas recuperadas com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar metas',
    },
  },
});

goalsApp.openapi(listGoalsRoute, async (c) => {
  const db = getDb(c);
  const { family_id } = c.req.valid('query');

  let query = db.from('goals').select('*').order('created_at', { ascending: false });
  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/goals
const createGoalRoute = createRoute({
  method: 'post',
  path: '/v1/goals',
  summary: 'Criar Meta',
  description: 'Cria uma nova meta de economia para a família.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateGoalSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: GoalSchema,
        },
      },
      description: 'Meta criada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar meta',
    },
  },
});

goalsApp.openapi(createGoalRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('goals')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// PATCH /v1/goals/:id
const updateGoalRoute = createRoute({
  method: 'patch',
  path: '/v1/goals/{id}',
  summary: 'Atualizar Meta',
  description: 'Atualiza os campos de uma meta (inclusive contribuições de valor).',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdateGoalSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: GoalSchema,
        },
      },
      description: 'Meta atualizada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar meta',
    },
  },
});

goalsApp.openapi(updateGoalRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('goals')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// DELETE /v1/goals/:id
const deleteGoalRoute = createRoute({
  method: 'delete',
  path: '/v1/goals/{id}',
  summary: 'Remover Meta',
  description: 'Exclui uma meta pelo seu UUID.',
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
      description: 'Meta removida com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar meta',
    },
  },
});

goalsApp.openapi(deleteGoalRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Meta ${id} removida` }, 200);
});

export default goalsApp;
