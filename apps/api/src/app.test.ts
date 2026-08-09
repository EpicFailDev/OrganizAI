import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('./lib/supabase.js', () => import('./test/supabase.js').then((m) => m.buildMockModule()));

import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from './lib/request-context.js';
import { createApp } from './app.js';
import { resetSupabaseState, state } from './test/supabase.js';

type App = OpenAPIHono<AppEnv>;

function request(app: App, path: string, init?: RequestInit) {
  return app.request(path, init, {
    server: {
      incoming: { socket: { remoteAddress: '127.0.0.1', remotePort: 55555, remoteFamily: 'IPv4' } },
    },
  });
}

describe('API global', () => {
  let app: App;

  beforeEach(() => {
    resetSupabaseState();
    app = createApp({ disableLogger: true });
  });

  it('GET /healthz responde ok', async () => {
    const res = await request(app, '/healthz');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('OrganizAI API');
    expect(typeof body.uptime).toBe('number');
  });

  it('rotas /v1 exigem token (401)', async () => {
    const res = await request(app, '/v1/transactions');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Não autenticado');
  });

  it('token inválido retorna 401', async () => {
    state.user = null;
    const res = await request(app, '/v1/transactions', {
      headers: { Authorization: 'Bearer token-invalido' },
    });
    expect(res.status).toBe(401);
  });

  it('GET /llms.txt retorna guia em texto', async () => {
    const res = await request(app, '/llms.txt');
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('organizai');
  });

  it('GET /llms-full.txt retorna a especificação completa', async () => {
    const res = await request(app, '/llms-full.txt');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('FinancialSummary');
  });

  it('GET /mcp.json retorna a configuração de descoberta', async () => {
    const res = await request(app, '/mcp.json');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('OrganizAI MCP');
    expect(body.tools).toEqual(['get_financial_summary', 'list_transactions', 'add_transaction', 'list_categories']);
  });

  it('GET /doc/json retorna OpenAPI 3.0', async () => {
    const res = await request(app, '/doc/json');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.openapi).toBe('3.0.0');
    expect(body.paths['/v1/transactions']).toBeTruthy();
    expect(body.paths['/v1/analytics/summary']).toBeTruthy();
  });

  it('GET /openapi.json redireciona para /doc/json', async () => {
    const res = await request(app, '/openapi.json');
    expect([301, 302, 303]).toContain(res.status);
    expect(res.headers.get('location')).toContain('/doc/json');
  });

  it('GET /docs redireciona para /doc', async () => {
    const res = await request(app, '/docs');
    expect([301, 302, 303]).toContain(res.status);
    expect(res.headers.get('location')).toContain('/doc');
  });

  it('GET /doc retorna a UI do Scalar', async () => {
    const res = await request(app, '/doc');
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('<!doctype html>');
  });

  it('GET / retorna a página raiz HTML', async () => {
    const res = await request(app, '/');
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('organizai api');
  });

  it('rotas inexistentes retornam 404 JSON', async () => {
    const res = await request(app, '/nao-existe');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Rota não encontrada');
  });

  it('aplica headers de segurança', async () => {
    const res = await request(app, '/healthz');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('CORS aceita a origem oficial', async () => {
    const res = await request(app, '/healthz', {
      headers: { Origin: 'https://organizai.duckdns.org' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('https://organizai.duckdns.org');
  });

  it('CORS não reflete origens desconhecidas', async () => {
    const res = await request(app, '/healthz', {
      headers: { Origin: 'https://malicioso.example.com' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});
