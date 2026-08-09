import { describe, expect, it, beforeEach } from 'vitest';
import { createTestApp, request, authHeaders, queryString, type TestApp } from './test/helpers.js';
import { resetSupabaseState, state, ok, err } from './test/supabase.js';

const FAMILY = 'a1b2c3d4-0000-0000-0000-000000000001';
const CATEGORY = 'a1b2c3d4-0000-0000-0000-000000000010';
const TX_ID = 'e3b0c442-98fc-11ee-b9d1-0242ac120002';
const USER_ID = 'user-1';

const listItem = {
  id: TX_ID,
  family_id: FAMILY,
  date: '2026-08-08',
  description: 'Supermercado',
  category_id: CATEGORY,
  type: 'expense',
  amount: 450.75,
  created_by: USER_ID,
  time: '14:30:00',
  categories: { name: 'Alimentação', color: '#EF4444' },
  subcategories: null,
  profiles: { display_name: 'Gui' },
};

describe('CRUD /v1/transactions', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('lista transações autenticado', async () => {
    state.tables.transactions = ok([listItem]);
    const res = await request(app, '/v1/transactions', { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([listItem]);
  });

  it('filtra por família e aplica ordenação', async () => {
    state.tables.transactions = ok([]);
    await request(app, `/v1/transactions${queryString({ family_id: FAMILY })}`, {
      headers: authHeaders(),
    });
    const from = state.calls.find((c) => c.type === 'from' && c.table === 'transactions');
    expect(from).toBeTruthy();
    expect(from?.ops).toContain('order:date');
    expect(from?.ops).toContain(`eq:family_id=${FAMILY}`);
  });

  it('cria transação injetando created_by do usuário autenticado', async () => {
    state.tables.transactions = ok({
      ...listItem,
      description: 'Almoço de Domingo',
      amount: 89.9,
    });
    const res = await request(app, '/v1/transactions', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: FAMILY,
        description: 'Almoço de Domingo',
        amount: 89.9,
        category_id: CATEGORY,
        date: '2026-08-09',
      }),
    });
    expect(res.status).toBe(201);
    const insert = state.calls.find((c) => c.type === 'from' && c.table === 'transactions');
    expect(insert?.ops.some((op) => op.startsWith('insert:') && op.includes('"created_by":"a1b2c3d4-0000-0000-0000-000000000001"'))).toBe(true);
  });

  it('rejeita data fora do formato AAAA-MM-DD (400)', async () => {
    const res = await request(app, '/v1/transactions', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: FAMILY,
        description: 'Teste',
        amount: 10,
        category_id: CATEGORY,
        date: '08/08/2026',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita hora fora do formato HH:MM:SS (400)', async () => {
    const res = await request(app, '/v1/transactions', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: FAMILY,
        description: 'Teste',
        amount: 10,
        category_id: CATEGORY,
        date: '2026-08-08',
        time: '14:30',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('atualiza transação existente', async () => {
    state.tables.transactions = ok({ ...listItem, description: 'Mercado Mensal' });
    const res = await request(app, `/v1/transactions/${TX_ID}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Mercado Mensal' }),
    });
    expect(res.status).toBe(200);
    const update = state.calls.find((c) => c.type === 'from' && c.table === 'transactions');
    expect(update?.ops).toContain(`eq:id=${TX_ID}`);
  });

  it('remove transação existente com sucesso', async () => {
    state.tables.transactions = ok({ id: TX_ID });
    const res = await request(app, `/v1/transactions/${TX_ID}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: 'Transação removido com sucesso' });
  });

  it('retorna 404 ao remover transação inexistente', async () => {
    state.tables.transactions = ok(null);
    const res = await request(app, `/v1/transactions/${TX_ID}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Transação não encontrado');
  });

  it('mapeia erro de RLS para 403', async () => {
    state.tables.transactions = err('42501');
    const res = await request(app, '/v1/transactions', { headers: authHeaders() });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Acesso negado');
  });

  it('não vaza mensagens internas em erro desconhecido (500 genérico)', async () => {
    state.tables.transactions = err('XX99', 'relation "transactions" does not exist');
    const res = await request(app, '/v1/transactions', { headers: authHeaders() });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('Erro interno do servidor');
  });

  it('retorna lista vazia quando o banco retorna null', async () => {
    state.tables.transactions = ok(null);
    const res = await request(app, '/v1/transactions', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
