import { defineResource, ListQuerySchema } from '../../lib/crud.js';
import {
  SaleSchema,
  CreateSaleSchema,
  UpdateSaleSchema,
} from '../../schemas/index.js';

export default defineResource({
  path: '/v1/sales',
  table: 'sales',
  labels: {
    entity: 'Venda',
    list: 'Listar Vendas',
    listDescription: 'Retorna as vendas da família, com o nome do produto.',
    create: 'Criar Venda',
    createDescription: 'Registra uma nova venda.',
    update: 'Atualizar Venda',
    updateDescription: 'Atualiza os dados de uma venda existente.',
    remove: 'Remover Venda',
    removeDescription: 'Exclui uma venda pelo seu UUID.',
  },
  listSchema: SaleSchema,
  createSchema: CreateSaleSchema,
  rowSchema: SaleSchema,
  updateSchema: UpdateSaleSchema,
  listQuerySchema: ListQuerySchema,
  listSelect: '*, products(name)',
  orderBy: { column: 'sale_date', ascending: false },
  filterQueryField: 'family_id',
  pagination: true,
  setCreatedBy: true,
});
