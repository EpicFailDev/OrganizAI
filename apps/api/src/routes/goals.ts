import { defineResource, ListQueryFilterableSchema } from '../lib/crud.js';
import {
  GoalSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
} from '../schemas/index.js';

export default defineResource({
  path: '/v1/goals',
  table: 'goals',
  labels: {
    entity: 'Meta',
    list: 'Listar Metas',
    listDescription: 'Retorna as metas financeiras da família.',
    create: 'Criar Meta',
    createDescription: 'Cria uma nova meta de economia para a família.',
    update: 'Atualizar Meta',
    updateDescription: 'Atualiza os campos de uma meta (inclusive contribuições de valor).',
    remove: 'Remover Meta',
    removeDescription: 'Exclui uma meta pelo seu UUID.',
  },
  listSchema: GoalSchema,
  createSchema: CreateGoalSchema,
  rowSchema: GoalSchema,
  updateSchema: UpdateGoalSchema,
  listQuerySchema: ListQueryFilterableSchema,
  orderBy: { column: 'created_at', ascending: false },
  filterQueryField: 'family_id',
});
