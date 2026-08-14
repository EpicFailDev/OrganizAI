import { createRoute, z } from '@hono/zod-openapi';
import { defineResource } from '../../lib/crud.js';
import { createApiApp } from '../../lib/hono.js';
import { getDb } from '../../lib/request-context.js';
import { dbErrorHandler } from '../../lib/errors.js';
import {
  CategorySchema,
  CreateCategorySchema,
  SubcategorySchema,
  CreateSubcategorySchema,
  ErrorResponseSchema,
} from '../../schemas/index.js';

const categoriesApp = createApiApp();

categoriesApp.route(
  '/',
  defineResource({
    path: '/v1/categories',
    table: 'categories',
    labels: {
      entity: 'Categoria',
      list: 'Listar Categorias',
      listDescription: 'Retorna a lista de categorias (padrões globais e da família do usuário).',
      create: 'Criar Categoria Customizada',
      createDescription: 'Cria uma categoria personalizada para a família do usuário.',
      update: 'Atualizar Categoria',
      updateDescription: 'Atualiza os dados de uma categoria existente.',
      remove: 'Remover Categoria',
      removeDescription: 'Exclui uma categoria customizada da família.',
    },
    listSchema: CategorySchema,
    createSchema: CreateCategorySchema,
    rowSchema: CategorySchema,
    orderBy: { column: 'name', ascending: true },
    withUpdate: false,
  })
);

categoriesApp.route(
  '/',
  defineResource({
    path: '/v1/subcategories',
    table: 'subcategories',
    labels: {
      entity: 'Subcategoria',
      list: 'Listar Subcategorias',
      listDescription: 'Retorna subcategorias, opcionalmente filtrando por categoria.',
      create: 'Criar Subcategoria',
      createDescription: 'Cria uma nova subcategoria vinculada a uma categoria.',
      update: 'Atualizar Subcategoria',
      updateDescription: 'Atualiza os dados de uma subcategoria existente.',
      remove: 'Remover Subcategoria',
      removeDescription: 'Exclui uma subcategoria pelo seu UUID.',
    },
    listSchema: SubcategorySchema,
    createSchema: CreateSubcategorySchema,
    rowSchema: SubcategorySchema,
    listQuerySchema: z.object({
      category_id: z.string().uuid().optional(),
    }),
    orderBy: { column: 'name', ascending: true },
    filterQueryField: 'category_id',
    withUpdate: false,
  })
);

// Rota para incrementar o contador de uso de categoria/subcategoria.
// Usa a RPC increment_category_usage (função SQL atômica) em vez de
// db.raw(), que não existe no cliente supabase-js.
const usageRoute = createRoute({
  method: 'post',
  path: '/v1/categories/{category_id}/usage',
  summary: 'Registrar uso de Categoria',
  description: 'Incrementa o contador de uso e atualiza last_used da categoria (e subcategoria, se informada).',
  request: {
    params: z.object({ category_id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            subcategory_id: z.string().uuid().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean() }) } },
      description: 'Uso registrado com sucesso',
    },
    400: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Dados de entrada inválidos',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Erro ao registrar uso',
    },
  },
});

categoriesApp.openapi(usageRoute, async (c) => {
  const db = getDb(c);
  const { category_id } = c.req.valid('param');
  const { subcategory_id } = c.req.valid('json');

  const { error } = await db.rpc('increment_category_usage', {
    p_category_id: category_id,
    p_subcategory_id: subcategory_id ?? null,
  });

  if (error) return dbErrorHandler(error);

  return c.json({ success: true }, 200);
});

export default categoriesApp;