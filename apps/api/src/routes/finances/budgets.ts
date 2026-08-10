import { defineResource, ListQueryFilterableSchema } from '../../lib/crud.js';
import {
  BudgetSchema,
  CreateBudgetSchema,
} from '../../schemas/index.js';

export default defineResource({
  path: '/v1/budgets',
  table: 'budgets',
  labels: {
    entity: 'Orçamento',
    list: 'Listar Orçamentos',
    listDescription: 'Retorna os orçamentos da família, com os dados da categoria.',
    create: 'Criar Orçamento',
    createDescription: 'Define um limite de gasto por categoria para a família.',
    update: 'Atualizar Orçamento',
    updateDescription: 'Atualiza os campos de um orçamento existente.',
    remove: 'Remover Orçamento',
    removeDescription: 'Exclui um orçamento pelo seu UUID.',
  },
  listSchema: BudgetSchema,
  createSchema: CreateBudgetSchema,
  rowSchema: BudgetSchema,
  listQuerySchema: ListQueryFilterableSchema,
  listSelect: '*, categories(name, color)',
  orderBy: { column: 'created_at', ascending: false },
  filterQueryField: 'family_id',
  withUpdate: false,
});
