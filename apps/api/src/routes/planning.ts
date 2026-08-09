import { defineResource, ListQueryFilterableSchema } from '../lib/crud.js';
import {
  PlanningItemSchema,
  CreatePlanningItemSchema,
  UpdatePlanningItemSchema,
} from '../schemas/index.js';

export default defineResource({
  path: '/v1/planning-items',
  table: 'planning_items',
  labels: {
    entity: 'Item de planejamento',
    list: 'Listar Itens de Planejamento',
    listDescription: 'Retorna os itens de planejamento da família, com os dados da categoria.',
    create: 'Criar Item de Planejamento',
    createDescription: 'Cria uma projeção de receita ou despesa futura.',
    update: 'Atualizar Item de Planejamento',
    updateDescription: 'Atualiza o status ou campos de um item de planejamento.',
    remove: 'Remover Item de Planejamento',
    removeDescription: 'Exclui um item de planejamento pelo seu UUID.',
  },
  listSchema: PlanningItemSchema,
  createSchema: CreatePlanningItemSchema,
  rowSchema: PlanningItemSchema,
  updateSchema: UpdatePlanningItemSchema,
  listQuerySchema: ListQueryFilterableSchema,
  listSelect: '*, categories(name, color)',
  orderBy: { column: 'expected_date', ascending: true },
  filterQueryField: 'family_id',
  setCreatedBy: true,
});
