import { z } from '@hono/zod-openapi';
import { defineResource } from '../../lib/crud.js';
import {
  ReceiptItemSchema,
  CreateReceiptItemSchema,
} from '../../schemas/index.js';

export default defineResource({
  path: '/v1/receipt-items',
  table: 'receipt_items',
  labels: {
    entity: 'Item de recibo',
    list: 'Listar Itens de Recibo',
    listDescription: 'Retorna os itens de recibo, opcionalmente filtrados por transação.',
    create: 'Criar Itens de Recibo',
    createDescription:
      'Insere um ou vários itens de recibo (smart modes de combustível, salgados, etc).',
    update: 'Atualizar Item de Recibo',
    updateDescription: 'Atualiza os dados de um item de recibo existente.',
    remove: 'Remover Item de Recibo',
    removeDescription: 'Exclui um item de recibo pelo seu UUID.',
  },
  listSchema: ReceiptItemSchema,
  createSchema: z.array(CreateReceiptItemSchema).min(1),
  rowSchema: ReceiptItemSchema,
  listQuerySchema: z.object({
    transaction_id: z.string().uuid().optional(),
  }),
  orderBy: { column: 'line_number', ascending: true },
  filterQueryField: 'transaction_id',
  bulkCreate: true,
  withUpdate: false,
  withDelete: false,
});
