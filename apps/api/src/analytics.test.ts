import { describe, expect, it, beforeEach } from 'vitest';
import { createTestApp, request, authHeaders, type TestApp } from './test/helpers.js';
import { resetSupabaseState, state, ok, err } from './test/supabase.js';

const USER_ID = 'user-1';
const FAMILY = 'a1b2c3d4-0000-0000-0000-000000000001';

describe('GET /v1/analytics/summary', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('identifica a família pela associação mais antiga (determinístico)', async () => {
    state.tables.family_members = ok({ family_id: FAMILY });
    state.rpcs.get_financial_summary = ok([
      { total_income: 300, total_expense: 150, balance: 150, transaction_count: 3, top_category: 'Lazer' },
    ]);
    state.tables.family_members_count = ok([{ profile_id: USER_ID }], 4);

    const res = await request(app, '/v1/analytics/summary', { headers: authHeaders() });
    expect(res.status).toBe(200);

    const membershipCall = state.calls.find(
      (c) => c.type === 'from' && c.table === 'family_members' && c.ops.includes('maybeSingle')
    );
    expect(membershipCall?.ops).toContain('order:joined_at');
    expect(membershipCall?.ops).toContain('limit:1');

    const body = await res.json();
    expect(body.total_income).toBe(300);
    expect(body.total_expenses).toBe(150);
    expect(body.net_balance).toBe(150);
    expect(body.transactions_count).toBe(3);
  });

  it('retorna resumo zerado quando o usuário não tem família', async () => {
    state.tables.family_members = ok(null);

    const res = await request(app, '/v1/analytics/summary', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      total_expenses: 0,
      total_income: 0,
      net_balance: 0,
      top_category: null,
      transactions_count: 0,
      family_members_count: 0,
    });
  });

  it('cai para agregação em memória quando a RPC não existe (PGRST202)', async () => {
    state.tables.family_members = ok({ family_id: FAMILY });
    state.rpcs.get_financial_summary = err('PGRST202', 'function not found');
    state.tables.transactions = ok([
      { type: 'expense', amount: 40, categories: { name: 'Mercado' } },
      { type: 'income', amount: 100, categories: null },
    ]);

    const res = await request(app, '/v1/analytics/summary', { headers: authHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_expenses).toBe(40);
    expect(body.total_income).toBe(100);
    expect(body.top_category).toBe('Mercado');
  });

  it('mapeia erro de RLS para 403', async () => {
    state.tables.family_members = err('42501');

    const res = await request(app, '/v1/analytics/summary', { headers: authHeaders() });
    expect(res.status).toBe(403);
  });
});
