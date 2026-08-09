import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  PricingRecipeSchema,
  CreatePricingRecipeSchema,
  UpdatePricingRecipeSchema,
  RecipeItemSchema,
  ReplaceRecipeItemsSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const recipesApp = new OpenAPIHono<AppEnv>();

// GET /v1/pricing-recipes
const listRecipesRoute = createRoute({
  method: 'get',
  path: '/v1/pricing-recipes',
  summary: 'Listar Receitas de Precificação',
  description: 'Retorna as receitas de precificação da família.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(PricingRecipeSchema),
        },
      },
      description: 'Receitas recuperadas com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar receitas',
    },
  },
});

recipesApp.openapi(listRecipesRoute, async (c) => {
  const db = getDb(c);
  const { family_id } = c.req.valid('query');

  let query = db
    .from('pricing_recipes')
    .select('*')
    .order('created_at', { ascending: false });
  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// GET /v1/pricing-recipes/:id
const getRecipeRoute = createRoute({
  method: 'get',
  path: '/v1/pricing-recipes/{id}',
  summary: 'Obter Receita de Precificação',
  description: 'Retorna uma receita de precificação pelo seu UUID.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PricingRecipeSchema,
        },
      },
      description: 'Receita recuperada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar receita',
    },
  },
});

recipesApp.openapi(getRecipeRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { data, error } = await db
    .from('pricing_recipes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// GET /v1/pricing-recipes/:id/items
const listRecipeItemsRoute = createRoute({
  method: 'get',
  path: '/v1/pricing-recipes/{id}/items',
  summary: 'Listar Itens da Receita',
  description: 'Retorna os ingredientes de uma receita de precificação.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(RecipeItemSchema),
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
      description: 'Erro ao buscar itens',
    },
  },
});

recipesApp.openapi(listRecipeItemsRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { data, error } = await db
    .from('recipe_items')
    .select('*')
    .eq('recipe_id', id)
    .order('sort_order', { ascending: true });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/pricing-recipes
const createRecipeRoute = createRoute({
  method: 'post',
  path: '/v1/pricing-recipes',
  summary: 'Criar Receita de Precificação',
  description: 'Cria uma nova receita de precificação.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreatePricingRecipeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: PricingRecipeSchema,
        },
      },
      description: 'Receita criada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar receita',
    },
  },
});

recipesApp.openapi(createRecipeRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('pricing_recipes')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// PATCH /v1/pricing-recipes/:id
const updateRecipeRoute = createRoute({
  method: 'patch',
  path: '/v1/pricing-recipes/{id}',
  summary: 'Atualizar Receita de Precificação',
  description: 'Atualiza os campos da receita (nome, rendimento, embalagem, observações).',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdatePricingRecipeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PricingRecipeSchema,
        },
      },
      description: 'Receita atualizada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar receita',
    },
  },
});

recipesApp.openapi(updateRecipeRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('pricing_recipes')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// PUT /v1/pricing-recipes/:id/items (substitui todos os itens)
const replaceRecipeItemsRoute = createRoute({
  method: 'put',
  path: '/v1/pricing-recipes/{id}/items',
  summary: 'Substituir Itens da Receita',
  description: 'Remove todos os itens atuais da receita e insere os novos.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: ReplaceRecipeItemsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), count: z.number() }),
        },
      },
      description: 'Itens substituídos com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao substituir itens',
    },
  },
});

recipesApp.openapi(replaceRecipeItemsRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const { items } = c.req.valid('json');

  const { error: deleteError } = await db
    .from('recipe_items')
    .delete()
    .eq('recipe_id', id);

  if (deleteError) {
    return c.json({ error: deleteError.message }, 500);
  }

  if (items.length === 0) {
    return c.json({ success: true, count: 0 }, 200);
  }

  const toInsert = items.map((item) => ({ recipe_id: id, ...item }));

  const { error: insertError } = await db
    .from('recipe_items')
    .insert(toInsert);

  if (insertError) {
    return c.json({ error: insertError.message }, 500);
  }

  return c.json({ success: true, count: toInsert.length }, 200);
});

// PATCH /v1/pricing-recipes/:id/products-cost
const updateRecipeProductsCostRoute = createRoute({
  method: 'patch',
  path: '/v1/pricing-recipes/{id}/products-cost',
  summary: 'Atualizar custo de produtos vinculados à receita',
  description: 'Atualiza o cost_price de todos os produtos que referenciam a receita.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            cost_price: z.number().min(0),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), count: z.number() }),
        },
      },
      description: 'Produtos atualizados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar produtos',
    },
  },
});

recipesApp.openapi(updateRecipeProductsCostRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const { cost_price } = c.req.valid('json');

  const { data, error } = await db
    .from('products')
    .update({ cost_price, updated_at: new Date().toISOString() })
    .eq('recipe_id', id)
    .select('id');

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, count: data?.length || 0 }, 200);
});

// DELETE /v1/pricing-recipes/:id
const deleteRecipeRoute = createRoute({
  method: 'delete',
  path: '/v1/pricing-recipes/{id}',
  summary: 'Remover Receita de Precificação',
  description: 'Exclui uma receita de precificação (os itens são removidos em cascata).',
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
      description: 'Receita removida com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar receita',
    },
  },
});

recipesApp.openapi(deleteRecipeRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('pricing_recipes')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Receita ${id} removida` }, 200);
});

export default recipesApp;
