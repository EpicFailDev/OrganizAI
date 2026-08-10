import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';
import { getDb, getUserId } from './request-context.js';
import type { AppEnv } from './request-context.js';
import { dbErrorHandler } from './errors.js';
import { createApiApp } from './hono.js';
import { ErrorResponseSchema } from '../schemas/index.js';

const ID_PARAM = z.object({ id: z.string().uuid() });
const OK_OBJECT = z.object({ success: z.boolean(), message: z.string() });
const DEFAULT_QUERY = z.object({});

export interface ResourceLabels {
  /** Nome da entidade em pt-BR, usado nas mensagens de remoção. */
  entity: string;
  list: string;
  listDescription: string;
  create: string;
  createDescription: string;
  update: string;
  updateDescription: string;
  remove: string;
  removeDescription: string;
}

export interface ResourceOptions {
  /** Caminho base das rotas, ex.: '/v1/transactions'. */
  path: string;
  /** Nome da tabela no banco. */
  table: string;
  labels: ResourceLabels;

  listSchema: z.ZodTypeAny;
  createSchema: z.ZodTypeAny;
  rowSchema: z.ZodTypeAny;
  updateSchema?: z.ZodTypeAny;
  listQuerySchema?: z.ZodObject<z.ZodRawShape>;

  /** Colunas selecionadas na listagem (default '*'). */
  listSelect?: string;
  orderBy?: { column: string; ascending?: boolean };
  /** Campo de query usado como filtro `.eq()`, ex.: 'family_id'. */
  filterQueryField?: string;
  /** Habilita paginação por range (from/limit na query). */
  pagination?: boolean;

  /** Body do POST é um array (criação em lote). */
  bulkCreate?: boolean;
  /** Injeta `created_by` com o userId autenticado no insert. */
  setCreatedBy?: boolean;
  /** Define `updated_at` no update. */
  setUpdatedAt?: boolean;

  withUpdate?: boolean;
  withDelete?: boolean;
}

/**
 * Gera rotas REST CRUD (GET/POST/PATCH/DELETE) padronizadas sobre uma tabela
 * do Supabase, com documentação OpenAPI e tratamento de erro consistente.
 *
 * Remove o boilerplate repetido de 12 rotas: cada recurso passa a declarar
 * apenas seus schemas e pequenas variações (joins, filtros, paginação).
 */
export function defineResource(options: ResourceOptions): OpenAPIHono<AppEnv> {
  const {
    path,
    table,
    labels,
    listSchema,
    createSchema,
    rowSchema,
    updateSchema,
    listQuerySchema = DEFAULT_QUERY,
    listSelect = '*',
    orderBy,
    filterQueryField,
    pagination = false,
    bulkCreate = false,
    setCreatedBy = false,
    setUpdatedAt = false,
    withUpdate = true,
    withDelete = true,
  } = options;

  const app = createApiApp();

  const listRoute = createRoute({
    method: 'get',
    path,
    summary: labels.list,
    description: labels.listDescription,
    request: { query: listQuerySchema },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(listSchema) } },
        description: 'Dados recuperados com sucesso',
      },
      500: {
        content: { 'application/json': { schema: ErrorResponseSchema } },
        description: 'Erro ao consultar o banco de dados',
      },
    },
  });

  app.openapi(listRoute, async (c) => {
    const db = getDb(c);
    const q = c.req.valid('query') as Record<string, unknown>;

    let query = db.from(table).select(listSelect);

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    if (filterQueryField) {
      const value = q[filterQueryField];
      // Filtra apenas quando o valor é de fato definido (0/'' são válidos).
      if (value !== undefined && value !== null) query = query.eq(filterQueryField, value);
    }

    if (pagination) {
      const from = Math.max(0, Number(q.from ?? 0));
      const limit = Math.min(1000, Math.max(1, Number(q.limit ?? 1000)));
      query = query.range(from, from + limit - 1);
    }

    const { data, error } = await query;
    if (error) return dbErrorHandler(error);

    return c.json(data || [], 200);
  });

  const createRouteSpec = createRoute({
    method: 'post',
    path,
    summary: labels.create,
    description: labels.createDescription,
    request: {
      body: {
        content: { 'application/json': { schema: createSchema } },
      },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: bulkCreate ? z.array(rowSchema) : rowSchema } },
        description: 'Recurso criado com sucesso',
      },
      400: {
        content: { 'application/json': { schema: ErrorResponseSchema } },
        description: 'Dados de entrada inválidos',
      },
      500: {
        content: { 'application/json': { schema: ErrorResponseSchema } },
        description: 'Erro ao inserir o recurso',
      },
    },
  });

  app.openapi(createRouteSpec, async (c) => {
    const db = getDb(c);
    const raw = c.req.valid('json') as Record<string, unknown>;
    const userId = getUserId(c);

    let payload: Record<string, unknown> | Record<string, unknown>[];
    if (bulkCreate) {
      const items = Array.isArray(raw) ? raw : [raw];
      payload = setCreatedBy
        ? items.map((item) => ({ ...item, created_by: userId }))
        : items;
    } else {
      const item = Array.isArray(raw) ? raw[0] ?? {} : raw;
      payload = setCreatedBy ? { ...item, created_by: userId } : item;
    }

    const query = bulkCreate
      ? db.from(table).insert(payload).select()
      : db.from(table).insert([payload]).select().single();

    const { data, error } = await query;
    if (error) return dbErrorHandler(error);

    return c.json(data, 201);
  });

  if (withUpdate && updateSchema) {
    const updateRoute = createRoute({
      method: 'patch',
      path: `${path}/{id}`,
      summary: labels.update,
      description: labels.updateDescription,
      request: {
        params: ID_PARAM,
        body: { content: { 'application/json': { schema: updateSchema } } },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: rowSchema } },
          description: 'Recurso atualizado com sucesso',
        },
        400: {
          content: { 'application/json': { schema: ErrorResponseSchema } },
          description: 'Dados de entrada inválidos ou body vazio',
        },
        404: {
          content: { 'application/json': { schema: ErrorResponseSchema } },
          description: 'Recurso não encontrado',
        },
        500: {
          content: { 'application/json': { schema: ErrorResponseSchema } },
          description: 'Erro ao atualizar o recurso',
        },
      },
    });

    app.openapi(updateRoute, async (c) => {
      const db = getDb(c);
      const { id } = c.req.valid('param');
      let body = c.req.valid('json') as Record<string, unknown>;

      if (!body || Object.keys(body).length === 0) {
        return c.json({ error: 'Body vazio: informe ao menos um campo' }, 400);
      }

      if (setUpdatedAt) {
        body = { ...body, updated_at: new Date().toISOString() };
      }

      const { data, error } = await db.from(table).update(body).eq('id', id).select().single();
      if (error) return dbErrorHandler(error);

      return c.json(data, 200);
    });
  }

  if (withDelete) {
    const deleteRoute = createRoute({
      method: 'delete',
      path: `${path}/{id}`,
      summary: labels.remove,
      description: labels.removeDescription,
      request: { params: ID_PARAM },
      responses: {
        200: {
          content: { 'application/json': { schema: OK_OBJECT } },
          description: 'Recurso removido com sucesso',
        },
        404: {
          content: { 'application/json': { schema: ErrorResponseSchema } },
          description: 'Recurso não encontrado',
        },
        500: {
          content: { 'application/json': { schema: ErrorResponseSchema } },
          description: 'Erro ao remover o recurso',
        },
      },
    });

    app.openapi(deleteRoute, async (c) => {
      const db = getDb(c);
      const { id } = c.req.valid('param');

      // .select() retorna as linhas realmente removidas; se nenhuma, o recurso
      // não existe (ou o RLS impediu) — respondemos 404.
      const { data: deleted, error } = await db
        .from(table)
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) return dbErrorHandler(error);
      if (!deleted) return c.json({ error: 'Registro não encontrado' }, 404);

      return c.json({ success: true, message: 'Registro removido com sucesso' }, 200);
    });
  }

  return app;
}

// Referência de schemas de query reutilizados pelas rotas de listagem.
export const ListQuerySchema = z.object({
  family_id: z.string().uuid().optional(),
  from: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(1000),
});

export const ListQueryFilterableSchema = z.object({
  family_id: z.string().uuid().optional(),
});
