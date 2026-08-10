import { OpenAPIHono, z } from '@hono/zod-openapi';
import { defineResource } from '../../lib/crud.js';
import type { AppEnv } from '../../lib/request-context.js';
import {
  CategorySchema,
  CreateCategorySchema,
  SubcategorySchema,
  CreateSubcategorySchema,
} from '../../schemas/index.js';

const categoriesApp = new OpenAPIHono<AppEnv>();

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

export default categoriesApp;
