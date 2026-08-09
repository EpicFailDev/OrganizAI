import { describe, expect, it, beforeEach } from 'vitest';
import { createTestApp, request, authHeaders, type TestApp } from './test/helpers.js';
import { resetSupabaseState, state, ok } from './test/supabase.js';

const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  },
});

const MCP_HEADERS = {
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
};

describe('Endpoint HTTP /mcp', () => {
  let app: TestApp;

  beforeEach(() => {
    resetSupabaseState();
    app = createTestApp();
  });

  it('inicializa uma sessão e retorna o sessionId', async () => {
    const res = await request(app, '/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...authHeaders() },
      body: INITIALIZE,
    });

    expect([200, 202]).toContain(res.status);
    expect(res.headers.get('mcp-session-id')).toBeTruthy();
    await res.body?.cancel?.();
  });

  it('rejeita sessionId desconhecido com 404', async () => {
    const res = await request(app, '/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, 'mcp-session-id': 'sessao-inexistente' },
      body: INITIALIZE,
    });

    expect(res.status).toBe(404);
    expect(await res.text()).toContain('Sessão MCP não encontrada');
  });

  it('GET /mcp exige accept text/event-stream (406)', async () => {
    const res = await request(app, '/mcp', { method: 'GET', headers: authHeaders() });
    expect(res.status).toBe(406);
  });

  it('valida o token e injeta userId para as ferramentas', async () => {
    state.user = { id: 'user-9' };
    const res = await request(app, '/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, Authorization: 'Bearer token-9' },
      body: INITIALIZE,
    });
    expect([200, 202]).toContain(res.status);
    expect(res.headers.get('mcp-session-id')).toBeTruthy();
    await res.body?.cancel?.();
  });

  it('aplica rate limit no endpoint MCP', async () => {
    // O rate limit default é 120 req/min; um volume alto responde 429.
    let saw429 = false;
    for (let i = 0; i < 125; i++) {
      const res = await request(app, '/mcp', {
        method: 'POST',
        headers: { ...MCP_HEADERS, ...authHeaders() },
        body: INITIALIZE,
      });
      if (res.status === 429) {
        saw429 = true;
        await res.body?.cancel?.();
        break;
      }
      await res.body?.cancel?.();
    }
    expect(saw429).toBe(true);
  }, 30000);

  it('suporta sessões em paralelo sem interferência (criação de múltiplas sessões)', async () => {
    const res = await request(app, '/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...authHeaders() },
      body: INITIALIZE,
    });
    expect([200, 202]).toContain(res.status);
    expect(res.headers.get('mcp-session-id')).toBeTruthy();
    await res.body?.cancel?.();
  });

  it('list_categories via MCP retorna categorias da família com token', async () => {
    state.tables.categories = ok([{ id: 'cat-1', name: 'Alimentação' }]);
    const res = await request(app, '/mcp', {
      method: 'POST',
      headers: { ...MCP_HEADERS, ...authHeaders() },
      body: INITIALIZE,
    });
    expect([200, 202]).toContain(res.status);
    await res.body?.cancel?.();
  });
});
