import { defineResource, ListQuerySchema } from '../../lib/crud.js';
import {
  TransactionSchema,
  TransactionListItemSchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
} from '../../schemas/index.js';

export default defineResource({
  path: '/v1/transactions',
  table: 'transactions',
  labels: {
    entity: 'Transação',
    list: 'Listar Transações',
    listDescription:
      'Retorna a lista de lançamentos financeiros (despesas e receitas), com categorias, subcategorias, perfis e itens de recibo.',
    create: 'Criar Nova Transação',
    createDescription: 'Cadastra uma nova receita, despesa ou transferência.',
    update: 'Atualizar Transação',
    updateDescription: 'Atualiza os campos de uma transação existente pelo seu UUID.',
    remove: 'Remover Transação',
    removeDescription: 'Exclui uma transação existente pelo seu UUID.',
  },
  listSchema: TransactionListItemSchema,
  createSchema: CreateTransactionSchema,
  rowSchema: TransactionSchema,
  updateSchema: UpdateTransactionSchema,
  listQuerySchema: ListQuerySchema,
  listSelect:
    '*, categories(name, color), subcategories(name), profiles(display_name), receipt_items(*)',
  orderBy: { column: 'date', ascending: false },
  filterQueryField: 'family_id',
  pagination: true,
  setCreatedBy: true,
});