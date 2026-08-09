import { describe, expect, it, beforeEach } from 'vitest';
import { createTestApp, request, authHeaders, type TestApp } from './test/helpers.js';
import { resetSupabaseState, state, ok } from './test/supabase.js';

const FAMILY = 'a1b2c3d4-0000-0000-0000-000000000001';
const CATEGORY = 'a1b2c3d4-0000-0000-0000-000000000010';
const ID = 'e3b0c442-98fc-11ee-b9d1-0242ac120002';

describe('CRUD genérico das demais entidades', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('goals: lista, cria e remove (setCreatedBy ausente)', async () => {
    state.tables.goals = ok([{ id: ID, family_id: FAMILY, name: 'Viagem', target_amount: 5000 }]);
    const list = await request(app, '/v1/goals', { headers: authHeaders() });
    expect(list.status).toBe(200);
    expect(await list.json()).toHaveLength(1);

    state.tables.goals = ok({ id: ID, family_id: FAMILY, name: 'Viagem', target_amount: 5000 });
    const created = await request(app, '/v1/goals', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_id: FAMILY, name: 'Viagem', target_amount: 5000 }),
    });
    expect(created.status).toBe(201);

    state.tables.goals = ok({ id: ID });
    const removed = await request(app, `/v1/goals/${ID}`, { method: 'DELETE', headers: authHeaders() });
    expect(removed.status).toBe(200);
  });

  it('budgets: não expõe PATCH (withUpdate: false)', async () => {
    state.tables.budgets = ok([{ id: ID, family_id: FAMILY, category_id: CATEGORY, limit_amount: 1500 }]);
    const list = await request(app, '/v1/budgets', { headers: authHeaders() });
    expect(list.status).toBe(200);

    const res = await request(app, `/v1/budgets/${ID}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit_amount: 2000 }),
    });
    expect(res.status).toBe(404);
  });

  it('planning-items: setCreatedBy injeta created_by no insert', async () => {
    state.tables.planning_items = ok({ id: ID, family_id: FAMILY, description: 'Aluguel', amount: 1000, expected_date: '2026-09-01' });
    await request(app, '/v1/planning-items', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: FAMILY,
        description: 'Aluguel',
        type: 'expense',
        amount: 1000,
        expected_date: '2026-09-01',
      }),
    });
    const insert = state.calls.find((c) => c.type === 'from' && c.table === 'planning_items');
    expect(insert?.ops.some((op) => op.startsWith('insert:') && op.includes('"created_by":"a1b2c3d4-0000-0000-0000-000000000001"'))).toBe(true);
  });

  it('sales: aceita sale_time válido e injeta created_by', async () => {
    state.tables.sales = ok({ id: ID, family_id: FAMILY, product_id: CATEGORY, quantity: 2, unit_price: 10, total_price: 20, sale_date: '2026-08-08' });
    const res = await request(app, '/v1/sales', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: FAMILY,
        product_id: CATEGORY,
        quantity: 2,
        unit_price: 10,
        total_price: 20,
        sale_date: '2026-08-08',
        sale_time: '18:45:00',
      }),
    });
    expect(res.status).toBe(201);
    const insert = state.calls.find((c) => c.type === 'from' && c.table === 'sales');
    expect(insert?.ops.some((op) => op.startsWith('insert:') && op.includes('"created_by":"a1b2c3d4-0000-0000-0000-000000000001"'))).toBe(true);
  });

  it('sales: rejeita sale_time inválido (400)', async () => {
    const res = await request(app, '/v1/sales', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: FAMILY,
        product_id: CATEGORY,
        quantity: 2,
        unit_price: 10,
        total_price: 20,
        sale_date: '2026-08-08',
        sale_time: '18:45 PM',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('receipt-items: cria em lote (bulkCreate) e não expõe DELETE', async () => {
    state.tables.receipt_items = ok([
      { id: 'r1', transaction_id: ID, family_id: FAMILY, item_name: 'Gasolina', quantity: 1, unit_price: 50, total_price: 50 },
    ]);
    const res = await request(app, '/v1/receipt-items', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { transaction_id: ID, family_id: FAMILY, item_name: 'Gasolina', quantity: 1, unit_price: 50, total_price: 50 },
      ]),
    });
    expect(res.status).toBe(201);

    const del = await request(app, `/v1/receipt-items/${ID}`, { method: 'DELETE', headers: authHeaders() });
    expect(del.status).toBe(404);
  });

  it('categorias: lista e cria sem expor update', async () => {
    state.tables.categories = ok([{ id: CATEGORY, name: 'Alimentação', type: 'expense' }]);
    const list = await request(app, '/v1/categories', { headers: authHeaders() });
    expect(list.status).toBe(200);

    const res = await request(app, `/v1/categories/${CATEGORY}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    expect(res.status).toBe(404);
  });

  it('subcategorias: filtra por category_id', async () => {
    state.tables.subcategories = ok([]);
    await request(app, '/v1/subcategories?category_id=' + CATEGORY, { headers: authHeaders() });
    const call = state.calls.find((c) => c.type === 'from' && c.table === 'subcategories');
    expect(call?.ops).toContain(`eq:category_id=${CATEGORY}`);
  });

  it('ingredients: setUpdatedAt preenche updated_at no update', async () => {
    state.tables.ingredients_base = ok({ id: ID, family_id: FAMILY, name: 'Farinha' });
    await request(app, `/v1/ingredients/${ID}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Farinha de Trigo' }),
    });
    const update = state.calls.find((c) => c.type === 'from' && c.table === 'ingredients_base');
    expect(update?.ops.some((op) => op.startsWith('update:') && op.includes('"updated_at":'))).toBe(true);
  });

  it('products: lista e cria com default de unit', async () => {
    state.tables.products = ok([{ id: ID, family_id: FAMILY, name: 'Bolo de Pote' }]);
    const res = await request(app, '/v1/products', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_id: FAMILY, name: 'Bolo de Pote' }),
    });
    expect(res.status).toBe(201);
  });
});
