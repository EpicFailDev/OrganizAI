import { describe, expect, it, beforeEach } from 'vitest';
import { createTestApp, request, authHeaders, type TestApp } from './test/helpers.js';
import { resetSupabaseState, state, ok, err } from './test/supabase.js';

const FAMILY = 'a1b2c3d4-0000-0000-0000-000000000001';
const RECIPE_ID = 'e3b0c442-98fc-11ee-b9d1-0242ac120002';
const USER_ID = 'user-1';

const recipe = {
  id: RECIPE_ID,
  family_id: FAMILY,
  name: 'Bolo de Pote',
  created_by: USER_ID,
  yield_quantity: 10,
  packaging_cost: 1.5,
  notes: null,
};

describe('Rotas /v1/pricing-recipes', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('lista receitas', async () => {
    state.tables.pricing_recipes = ok([recipe]);
    const res = await request(app, '/v1/pricing-recipes', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([recipe]);
  });

  it('obtém uma receita pelo id', async () => {
    state.tables.pricing_recipes = ok(recipe);
    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe('Bolo de Pote');
  });

  it('lista os itens de uma receita', async () => {
    state.tables.recipe_items = ok([{ id: 'item-1', recipe_id: RECIPE_ID, ingredient_name: 'Farinha' }]);
    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}/items`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it('substitui itens de forma transacional via RPC', async () => {
    state.rpcs.replace_recipe_items = ok(2);
    const items = [
      { ingredient_name: 'Farinha', package_grams: 1000, package_cost: 8, used_grams: 500, sort_order: 0 },
      { ingredient_name: 'Açúcar', package_grams: 1000, package_cost: 6, used_grams: 300, sort_order: 1 },
    ];

    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}/items`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, count: 2 });

    const call = state.calls.find((c) => c.type === 'rpc' && c.fn === 'replace_recipe_items');
    expect(call).toBeTruthy();
    expect(call?.args).toEqual({ p_recipe_id: RECIPE_ID, p_items: items });
  });

  it('propaga erro da RPC de substituição como 400 (P0001)', async () => {
    state.rpcs.replace_recipe_items = err('P0001', 'Receita não encontrada');
    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}/items`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ ingredient_name: 'X' }] }),
    });
    expect(res.status).toBe(400);
  });

  it('atualiza custo dos produtos quando a receita existe', async () => {
    state.tables.pricing_recipes = ok({ id: RECIPE_ID });
    state.tables.products = ok([{ id: 'prod-1' }, { id: 'prod-2' }]);

    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}/products-cost`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_price: 12.5 }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, count: 2 });

    const update = state.calls.find((c) => c.type === 'from' && c.table === 'products');
    expect(update?.ops).toContain(`eq:recipe_id=${RECIPE_ID}`);
  });

  it('retorna 404 ao atualizar custo de receita inexistente', async () => {
    state.tables.pricing_recipes = ok(null);

    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}/products-cost`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_price: 12.5 }),
    });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Receita não encontrada');
  });

  it('mapeia erro de RLS na checagem da receita para 403', async () => {
    state.tables.pricing_recipes = err('42501');

    const res = await request(app, `/v1/pricing-recipes/${RECIPE_ID}/products-cost`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_price: 12.5 }),
    });

    expect(res.status).toBe(403);
  });
});
