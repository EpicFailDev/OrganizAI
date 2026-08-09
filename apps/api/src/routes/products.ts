import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  ProductSchema,
  CreateProductSchema,
  UpdateProductSchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const productsApp = new OpenAPIHono<AppEnv>();

// GET /v1/products
const listProductsRoute = createRoute({
  method: 'get',
  path: '/v1/products',
  summary: 'Listar Produtos',
  description: 'Retorna os produtos cadastrados da família.',
  request: {
    query: z.object({
      family_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(ProductSchema),
        },
      },
      description: 'Produtos recuperados com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar produtos',
    },
  },
});

productsApp.openapi(listProductsRoute, async (c) => {
  const db = getDb(c);
  const { family_id } = c.req.valid('query');

  let query = db.from('products').select('*').order('name');
  if (family_id) query = query.eq('family_id', family_id);

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/products
const createProductRoute = createRoute({
  method: 'post',
  path: '/v1/products',
  summary: 'Criar Produto',
  description: 'Cadastra um novo produto da família.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateProductSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ProductSchema,
        },
      },
      description: 'Produto criado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar produto',
    },
  },
});

productsApp.openapi(createProductRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('products')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// PATCH /v1/products/:id
const updateProductRoute = createRoute({
  method: 'patch',
  path: '/v1/products/{id}',
  summary: 'Atualizar Produto',
  description: 'Atualiza os dados de um produto (preço de venda, custo, etc).',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: UpdateProductSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ProductSchema,
        },
      },
      description: 'Produto atualizado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao atualizar produto',
    },
  },
});

productsApp.openapi(updateProductRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('products')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 200);
});

// DELETE /v1/products/:id
const deleteProductRoute = createRoute({
  method: 'delete',
  path: '/v1/products/{id}',
  summary: 'Remover Produto',
  description: 'Exclui um produto pelo seu UUID.',
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
      description: 'Produto removido com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar produto',
    },
  },
});

productsApp.openapi(deleteProductRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Produto ${id} removido` }, 200);
});

export default productsApp;
