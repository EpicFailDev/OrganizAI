import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Ingredientes Base (Tabela de Precificação)
// ----------------------------------------------------
export const IngredientSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  package_grams: z.number(),
  package_cost: z.number(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).openapi('Ingredient');

export const CreateIngredientSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  package_grams: z.number().optional().default(0),
  package_cost: z.number().optional().default(0),
}).openapi('CreateIngredient');

export const UpdateIngredientSchema = z.object({
  name: z.string().optional(),
  package_grams: z.number().optional(),
  package_cost: z.number().optional(),
}).openapi('UpdateIngredient');

// ----------------------------------------------------
// Receitas de Precificação e Itens
// ----------------------------------------------------
export const PricingRecipeSchema = z.object({
  id: z.string().uuid(),
  family_id: z.string().uuid(),
  name: z.string(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  yield_quantity: z.number().optional(),
  packaging_cost: z.number().optional(),
  notes: z.string().nullable().optional(),
}).openapi('PricingRecipe');

export const CreatePricingRecipeSchema = z.object({
  family_id: z.string().uuid(),
  name: z.string().min(1),
  yield_quantity: z.number().optional().default(10),
  packaging_cost: z.number().optional().default(0),
}).openapi('CreatePricingRecipe');

export const UpdatePricingRecipeSchema = z.object({
  name: z.string().optional(),
  yield_quantity: z.number().optional(),
  packaging_cost: z.number().optional(),
  notes: z.string().nullable().optional(),
}).openapi('UpdatePricingRecipe');

export const RecipeItemSchema = z.object({
  id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  ingredient_name: z.string(),
  package_grams: z.number().optional(),
  package_cost: z.number().optional(),
  used_grams: z.number().optional(),
  sort_order: z.number().optional(),
  created_at: z.string().optional(),
}).openapi('RecipeItem');

export const ReplaceRecipeItemsSchema = z.object({
  items: z.array(z.object({
    ingredient_name: z.string(),
    package_grams: z.number().optional().default(0),
    package_cost: z.number().optional().default(0),
    used_grams: z.number().optional().default(0),
    sort_order: z.number().optional().default(0),
  })),
}).openapi('ReplaceRecipeItems');
