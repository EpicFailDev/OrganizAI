import { defineResource, ListQueryFilterableSchema } from '../lib/crud.js';
import {
  IngredientSchema,
  CreateIngredientSchema,
  UpdateIngredientSchema,
} from '../schemas/index.js';

export default defineResource({
  path: '/v1/ingredients',
  table: 'ingredients_base',
  labels: {
    entity: 'Ingrediente',
    list: 'Listar Ingredientes Base',
    listDescription: 'Retorna a tabela base de ingredientes da família.',
    create: 'Criar Ingrediente',
    createDescription: 'Adiciona um novo ingrediente à tabela base.',
    update: 'Atualizar Ingrediente',
    updateDescription: 'Atualiza os dados de um ingrediente da tabela base.',
    remove: 'Remover Ingrediente',
    removeDescription: 'Exclui um ingrediente da tabela base pelo seu UUID.',
  },
  listSchema: IngredientSchema,
  createSchema: CreateIngredientSchema,
  rowSchema: IngredientSchema,
  updateSchema: UpdateIngredientSchema,
  listQuerySchema: ListQueryFilterableSchema,
  orderBy: { column: 'name', ascending: true },
  filterQueryField: 'family_id',
  setUpdatedAt: true,
});
