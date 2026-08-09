import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import {
  CategorySchema,
  CreateCategorySchema,
  SubcategorySchema,
  CreateSubcategorySchema,
  ErrorResponseSchema,
} from '../schemas/index.js';

const categoriesApp = new OpenAPIHono<AppEnv>();

// GET /v1/categories
const listCategoriesRoute = createRoute({
  method: 'get',
  path: '/v1/categories',
  summary: 'Listar Categorias',
  description: 'Retorna a lista de categorias (padrões globais e da família do usuário).',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(CategorySchema),
        },
      },
      description: 'Categorias recuperadas com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar categorias',
    },
  },
});

categoriesApp.openapi(listCategoriesRoute, async (c) => {
  const db = getDb(c);
  const { data, error } = await db
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/categories
const createCategoryRoute = createRoute({
  method: 'post',
  path: '/v1/categories',
  summary: 'Criar Categoria Customizada',
  description: 'Cria uma categoria personalizada para a família do usuário.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateCategorySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: CategorySchema,
        },
      },
      description: 'Categoria criada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar categoria',
    },
  },
});

categoriesApp.openapi(createCategoryRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('categories')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// DELETE /v1/categories/:id
const deleteCategoryRoute = createRoute({
  method: 'delete',
  path: '/v1/categories/{id}',
  summary: 'Remover Categoria',
  description: 'Exclui uma categoria customizada da família.',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Categoria removida com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar categoria',
    },
  },
});

categoriesApp.openapi(deleteCategoryRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Categoria ${id} removida` }, 200);
});

// GET /v1/subcategories
const listSubcategoriesRoute = createRoute({
  method: 'get',
  path: '/v1/subcategories',
  summary: 'Listar Subcategorias',
  description: 'Retorna subcategorias, opcionalmente filtrando por categoria.',
  request: {
    query: z.object({
      category_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(SubcategorySchema),
        },
      },
      description: 'Subcategorias recuperadas com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao buscar subcategorias',
    },
  },
});

categoriesApp.openapi(listSubcategoriesRoute, async (c) => {
  const db = getDb(c);
  const { category_id } = c.req.valid('query');

  let query = db.from('subcategories').select('*').order('name');

  if (category_id) {
    query = query.eq('category_id', category_id);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data || [], 200);
});

// POST /v1/subcategories
const createSubcategoryRoute = createRoute({
  method: 'post',
  path: '/v1/subcategories',
  summary: 'Criar Subcategoria',
  description: 'Cria uma nova subcategoria vinculada a uma categoria.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateSubcategorySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SubcategorySchema,
        },
      },
      description: 'Subcategoria criada com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao criar subcategoria',
    },
  },
});

categoriesApp.openapi(createSubcategoryRoute, async (c) => {
  const db = getDb(c);
  const body = c.req.valid('json');

  const { data, error } = await db
    .from('subcategories')
    .insert([body])
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data, 201);
});

// DELETE /v1/subcategories/:id
const deleteSubcategoryRoute = createRoute({
  method: 'delete',
  path: '/v1/subcategories/{id}',
  summary: 'Remover Subcategoria',
  description: 'Exclui uma subcategoria pelo seu UUID.',
  request: {
    params: z.object({
      id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: 'Subcategoria removida com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao deletar subcategoria',
    },
  },
});

categoriesApp.openapi(deleteSubcategoryRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { error } = await db
    .from('subcategories')
    .delete()
    .eq('id', id);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, message: `Subcategoria ${id} removida` }, 200);
});

export default categoriesApp;
