import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  PlanningItemSchema,
  CreatePlanningItemSchema,
  UpdatePlanningItemSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const planningApp = new OpenAPIHono<AppEnv>();

// GET /v1/planning-items
const listPlanningItemsRoute = createRoute({
  method: 'get',
  path: '/v1/planning-items',
  summary: 'Listar Itens de Planejamento',
  description: 'Retorna os itens de planejamento da família, com os dados da categoria.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(PlanningItemSchema),
        },
      },
      description: 'Itens de planejamento recuperados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar itens de planejamento',
    },
  },
});

planningApp.openapi(listPlanningItemsRoute, async (c) => {
  const db = getDb(c);
  const { family_id } = c.req.valid('query');

  let query = db
    .from('planning_items')
    .select('*, categories(name, color)')
    .order('expected_date', { ascending: true });
  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/planning-items
const createPlanningItemRoute = createRoute({
  method: 'post',
  path: '/v1/planning-items',
  summary: 'Criar Item de Planejamento',
  description: 'Cria uma projeção de receita ou despesa futura.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreatePlanningItemSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: PlanningItemSchema,
        },
      },
      description: 'Item criado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar item',
    },
  },
});

planningApp.openapi(createPlanningItemRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('planning_items')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// PATCH /v1/planning-items/:id
const updatePlanningItemRoute = createRoute({
  method: 'patch',
  path: '/v1/planning-items/{id}',
  summary: 'Atualizar Item de Planejamento',
  description: 'Atualiza o status ou campos de um item de planejamento.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdatePlanningItemSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PlanningItemSchema,
        },
      },
      description: 'Item atualizado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar item',
    },
  },
});

planningApp.openapi(updatePlanningItemRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('planning_items')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// DELETE /v1/planning-items/:id
const deletePlanningItemRoute = createRoute({
  method: 'delete',
  path: '/v1/planning-items/{id}',
  summary: 'Remover Item de Planejamento',
  description: 'Exclui um item de planejamento pelo seu UUID.',
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
      description: 'Item removido com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar item',
    },
  },
});

planningApp.openapi(deletePlanningItemRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('planning_items')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Item ${id} removido` }, 200);
});

export default planningApp;
