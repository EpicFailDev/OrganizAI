import { defineResource, ListQueryFilterableSchema } from '../../lib/crud.js';
import {
  ProductSchema,
  CreateProductSchema,
  UpdateProductSchema,
} from '../../schemas/index.js';

export default defineResource({
  path: '/v1/products',
  table: 'products',
  labels: {
    entity: 'Produto',
    list: 'Listar Produtos',
    listDescription: 'Retorna os produtos cadastrados da família.',
    create: 'Criar Produto',
    createDescription: 'Cadastra um novo produto da família.',
    update: 'Atualizar Produto',
    updateDescription: 'Atualiza os dados de um produto (preço de venda, custo, etc).',
    remove: 'Remover Produto',
    removeDescription: 'Exclui um produto pelo seu UUID.',
  },
  listSchema: ProductSchema,
  createSchema: CreateProductSchema,
  rowSchema: ProductSchema,
  updateSchema: UpdateProductSchema,
  listQuerySchema: ListQueryFilterableSchema,
  orderBy: { column: 'name', ascending: true },
  filterQueryField: 'family_id',
  setUpdatedAt: true,
});
