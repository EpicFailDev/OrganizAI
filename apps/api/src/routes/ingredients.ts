import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  IngredientSchema,
  CreateIngredientSchema,
  UpdateIngredientSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const ingredientsApp = new OpenAPIHono<AppEnv>();

// GET /v1/ingredients
const listIngredientsRoute = createRoute({
  method: 'get',
  path: '/v1/ingredients',
  summary: 'Listar Ingredientes Base',
  description: 'Retorna a tabela base de ingredientes da família.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(IngredientSchema),
        },
      },
      description: 'Ingredientes recuperados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar ingredientes',
    },
  },
});

ingredientsApp.openapi(listIngredientsRoute, async (c) => {
  const db = getDb(c);
  const { family_id } = c.req.valid('query');

  let query = db.from('ingredients_base').select('*').order('name');
  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/ingredients
const createIngredientRoute = createRoute({
  method: 'post',
  path: '/v1/ingredients',
  summary: 'Criar Ingrediente',
  description: 'Adiciona um novo ingrediente à tabela base.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateIngredientSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: IngredientSchema,
        },
      },
      description: 'Ingrediente criado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar ingrediente',
    },
  },
});

ingredientsApp.openapi(createIngredientRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('ingredients_base')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// PATCH /v1/ingredients/:id
const updateIngredientRoute = createRoute({
  method: 'patch',
  path: '/v1/ingredients/{id}',
  summary: 'Atualizar Ingrediente',
  description: 'Atualiza os dados de um ingrediente da tabela base.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdateIngredientSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: IngredientSchema,
        },
      },
      description: 'Ingrediente atualizado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar ingrediente',
    },
  },
});

ingredientsApp.openapi(updateIngredientRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('ingredients_base')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// DELETE /v1/ingredients/:id
const deleteIngredientRoute = createRoute({
  method: 'delete',
  path: '/v1/ingredients/{id}',
  summary: 'Remover Ingrediente',
  description: 'Exclui um ingrediente da tabela base pelo seu UUID.',
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
      description: 'Ingrediente removido com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar ingrediente',
    },
  },
});

ingredientsApp.openapi(deleteIngredientRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('ingredients_base')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Ingrediente ${id} removido` }, 200);
});

export default ingredientsApp;
