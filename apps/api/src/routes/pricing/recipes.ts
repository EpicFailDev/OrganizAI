import { createRoute, z } from '@hono/zod-openapi';
import { defineResource, ListQueryFilterableSchema } from '../../lib/crud.js';
import { getDb } from '../../lib/request-context.js';
import { dbErrorHandler } from '../../lib/errors.js';
import {
  PricingRecipeSchema,
  CreatePricingRecipeSchema,
  UpdatePricingRecipeSchema,
  RecipeItemSchema,
  ReplaceRecipeItemsSchema,
  ErrorResponseSchema,
} from '../../schemas/index.js';

const recipesApp = defineResource({
  path: '/v1/pricing-recipes',
  table: 'pricing_recipes',
  labels: {
    entity: 'Receita de precificação',
    list: 'Listar Receitas de Precificação',
    listDescription: 'Retorna as receitas de precificação da família.',
    create: 'Criar Receita de Precificação',
    createDescription: 'Cria uma nova receita de precificação.',
    update: 'Atualizar Receita de Precificação',
    updateDescription: 'Atualiza os campos da receita (nome, rendimento, embalagem, observações).',
    remove: 'Remover Receita de Precificação',
    removeDescription: 'Exclui uma receita de precificação (os itens são removidos em cascata).',
  },
  listSchema: PricingRecipeSchema,
  createSchema: CreatePricingRecipeSchema,
  rowSchema: PricingRecipeSchema,
  updateSchema: UpdatePricingRecipeSchema,
  listQuerySchema: ListQueryFilterableSchema,
  orderBy: { column: 'created_at', ascending: false },
  filterQueryField: 'family_id',
  setCreatedBy: true,
});

// GET /v1/pricing-recipes/:id
const getRecipeRoute = createRoute({
  method: 'get',
  path: '/v1/pricing-recipes/{id}',
  summary: 'Obter Receita de Precificação',
  description: 'Retorna uma receita de precificação pelo seu UUID.',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: PricingRecipeSchema } },
      description: 'Receita recuperada com sucesso',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Receita não encontrada',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Erro ao buscar receita',
    },
  },
});

recipesApp.openapi(getRecipeRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');

  const { data, error } = await db.from('pricing_recipes').select('*').eq('id', id).single();
  if (error) return dbErrorHandler(error);

  return c.json(data, 200);
});

// GET /v1/pricing-recipes/:id/items
const listRecipeItemsRoute = createRoute({
  method: 'get',
  path: '/v1/pricing-recipes/{id}/items',
  summary: 'Listar Itens da Receita',
  description: 'Retorna os ingredientes de uma receita de precificação.',
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(RecipeItemSchema) } },
      description: 'Itens recuperados com sucesso',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
  if (error) return dbErrorHandler(error);

  return c.json(data || [], 200);
});

// PUT /v1/pricing-recipes/:id/items (substitui todos os itens)
const replaceRecipeItemsRoute = createRoute({
  method: 'put',
  path: '/v1/pricing-recipes/{id}/items',
  summary: 'Substituir Itens da Receita',
  description: 'Remove todos os itens atuais da receita e insere os novos (em uma única transação no banco).',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { 'application/json': { schema: ReplaceRecipeItemsSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), count: z.number() }) } },
      description: 'Itens substituídos com sucesso',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Erro ao substituir itens',
    },
  },
});

recipesApp.openapi(replaceRecipeItemsRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const { items } = c.req.valid('json');

  // RPC transacional (SECURITY DEFINER): valida que a receita é da família do
  // usuário, remove os itens atuais e insere os novos num único passo.
  const { data, error } = await db.rpc('replace_recipe_items', {
    p_recipe_id: id,
    p_items: items,
  });
  if (error) return dbErrorHandler(error);

  return c.json({ success: true, count: Number(data ?? items.length) }, 200);
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
          schema: z.object({ cost_price: z.number().min(0) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ success: z.boolean(), count: z.number() }) } },
      description: 'Produtos atualizados com sucesso',
    },
    404: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Receita não encontrada',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Erro ao atualizar produtos',
    },
  },
});

recipesApp.openapi(updateRecipeProductsCostRoute, async (c) => {
  const db = getDb(c);
  const { id } = c.req.valid('param');
  const { cost_price } = c.req.valid('json');

  // Garante que a receita existe e pertence à família do usuário (o SELECT
  // passa pela RLS de pricing_recipes). Caso contrário, 404.
  const { data: recipe, error: recipeError } = await db
    .from('pricing_recipes')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (recipeError) return dbErrorHandler(recipeError);
  if (!recipe) return c.json({ error: 'Receita não encontrada' }, 404);

  const { data, error } = await db
    .from('products')
    .update({ cost_price, updated_at: new Date().toISOString() })
    .eq('recipe_id', id)
    .select('id');
  if (error) return dbErrorHandler(error);

  return c.json({ success: true, count: data?.length || 0 }, 200);
});

export default recipesApp;
