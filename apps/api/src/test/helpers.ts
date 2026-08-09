import type { OpenAPIHono } from '@hono/zod-openapi';
import { createApp } from '../app.js';
import type { AppEnv } from '../lib/request-context.js';
import { resetSupabaseState } from './supabase.js';

export type TestApp = OpenAPIHono<AppEnv>;

/**
 * Ambiente fake do node-server (getConnInfo) passado ao app.request(), para o
 * rate limit poder ler o IP sem depender do servidor real.
 */
const TEST_ENV = {
  server: {
    incoming: {
      socket: { remoteAddress: '127.0.0.1', remotePort: 55555, remoteFamily: 'IPv4' },
    },
  },
};

/** Cria a app de produção (sem logs) com o mock do Supabase ativo. */
export function createTestApp(): TestApp {
  return createApp({ disableLogger: true });
}

/** Executa uma requisição na app com o ambiente fake injetado. */
export function request(app: TestApp, path: string, init?: RequestInit): Promise<Response> {
  return Promise.resolve(app.request(path, init, TEST_ENV));
}

/** Header de autenticação com um token JWT fake (o mock valida qualquer token). */
export function authHeaders(token = 'jwt-token'): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** URLSearchParams utilitário para queries de listagem. */
export function queryString(params: Record<string, string | number>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) search.set(k, String(v));
  const s = search.toString();
  return s ? `?${s}` : '';
}

export { resetSupabaseState };
