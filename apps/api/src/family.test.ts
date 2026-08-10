import { describe, expect, it, beforeEach } from 'vitest';
import { createTestApp, request, authHeaders, type TestApp } from './test/helpers.js';
import { resetSupabaseState, state, ok, err } from './test/supabase.js';

const USER_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const OTHER_USER = 'a1b2c3d4-0000-0000-0000-000000000002';
const FAMILY = 'b1b2c3d4-0000-0000-0000-000000000001';

const profile = { id: USER_ID, display_name: 'Gui', avatar_url: null, profession: 'Dev' };

describe('Rotas /v1/profile', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('obtém o perfil de um usuário', async () => {
    state.tables.profiles = ok(profile);
    const res = await request(app, `/v1/profile/${USER_ID}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
  });

  it('retorna 404 quando o perfil não existe', async () => {
    state.tables.profiles = err('PGRST116');
    const res = await request(app, `/v1/profile/${USER_ID}`, { headers: authHeaders() });
    expect(res.status).toBe(404);
  });

  it('só permite alterar o próprio perfil (403 para outro usuário)', async () => {
    state.tables.profiles = ok(profile);
    const res = await request(app, `/v1/profile/${OTHER_USER}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'X' }),
    });
    expect(res.status).toBe(403);
  });

  it('atualiza o próprio perfil', async () => {
    state.tables.profiles = ok({ ...profile, display_name: 'Guilherme' });
    const res = await request(app, `/v1/profile/${USER_ID}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'Guilherme' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).display_name).toBe('Guilherme');
  });
});

describe('Rotas /v1/me e /v1/family', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('obtém a associação familiar do usuário logado', async () => {
    state.tables.family_members = ok({
      family_id: FAMILY,
      profile_id: USER_ID,
      role: 'admin',
      joined_at: '2026-01-01T00:00:00Z',
      family_groups: { id: FAMILY, name: 'Minha Família' },
    });
    const res = await request(app, '/v1/me/family', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).role).toBe('admin');
  });

  it('retorna null quando o usuário não tem família', async () => {
    state.tables.family_members = ok(null);
    const res = await request(app, '/v1/me/family', { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('lista os membros da família', async () => {
    state.tables.family_members = ok([
      { family_id: FAMILY, profile_id: USER_ID, role: 'admin', joined_at: '2026-01-01T00:00:00Z', profiles: { display_name: 'Gui' } },
    ]);
    const res = await request(app, `/v1/family/${FAMILY}/members`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it('cria um grupo familiar via RPC', async () => {
    state.rpcs.create_family = ok(FAMILY);
    const res = await request(app, '/v1/family', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Família Teste' }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ family_id: FAMILY });
  });

  it('ingressa em um grupo via código de convite', async () => {
    state.rpcs.join_family = ok();
    const res = await request(app, '/v1/family/join', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: 'ABCDEF12' }),
    });
    expect(res.status).toBe(200);
    const call = state.calls.find((c) => c.type === 'rpc' && c.fn === 'join_family');
    expect(call?.args).toEqual({ p_invite_code: 'ABCDEF12' });
  });

  it('rejeita código de convite com formato inválido (400)', async () => {
    const res = await request(app, '/v1/family/join', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: 'AB12' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Dados de entrada inválidos');
  });

  it('propaga erro de código inválido como 400 (P0001)', async () => {
    state.rpcs.join_family = err('P0001', 'Código de convite inválido');
    const res = await request(app, '/v1/family/join', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: 'INVALIDO' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Código de convite inválido');
  });

  it('remove um membro da família', async () => {
    state.tables.family_members = ok({ profile_id: OTHER_USER });
    const res = await request(app, `/v1/family/${FAMILY}/members/${OTHER_USER}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const call = state.calls.find((c) => c.type === 'from' && c.table === 'family_members' && c.ops.includes('delete'));
    expect(call?.ops).toContain(`eq:family_id=${FAMILY}`);
    expect(call?.ops).toContain(`eq:profile_id=${OTHER_USER}`);
  });

  it('obtém os dados do grupo familiar', async () => {
    state.tables.family_groups = ok({ id: FAMILY, name: 'Família Teste', invite_code: 'ABCDE' });
    const res = await request(app, `/v1/family/${FAMILY}`, { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe('Família Teste');
  });
});
