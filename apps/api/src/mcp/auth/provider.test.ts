import { describe, expect, it, beforeEach } from 'vitest';
import type { Response } from 'express';
import { SupabaseOAuthProvider } from './provider.js';
import type { AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { resetSupabaseState, state } from '../../test/supabase.js';

const CLIENT = {
  redirect_uris: ['http://127.0.0.1:9999/callback'],
  token_endpoint_auth_method: 'none',
  client_name: 'test-client',
};

function makeSession(access: string, refresh: string, userId: string, email = 'gui@organizai.local') {
  return {
    access_token: access,
    refresh_token: refresh,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: userId, email },
  };
}

interface FakeRes {
  statusCode: number;
  text: string;
  location?: string;
  status(code: number): FakeRes;
  setHeader(k: string, v: string): void;
  send(html: string): FakeRes;
  redirect(code: number, url: string): void;
}

/** Fake de express.Response com `req` para o provider.authorize. */
function makeFakeRes(req: Partial<{ method: string; body: Record<string, string> }>): FakeRes {
  const headers: Record<string, string> = {};
  const fake: FakeRes = {
    statusCode: 200,
    text: '',
    status(code: number) {
      fake.statusCode = code;
      return fake;
    },
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    send(html: string) {
      fake.text = html;
      return fake;
    },
    redirect(code: number, url: string) {
      fake.statusCode = code;
      fake.location = url;
    },
  };
  (fake as unknown as Record<string, unknown>).req = req;
  return fake;
}

/** Registra o cliente de teste e devolve o registro completo. */
async function register(provider: SupabaseOAuthProvider) {
  return await provider.clientsStore.registerClient!(CLIENT);
}

function authorizeParams(overrides: Partial<AuthorizationParams> = {}): AuthorizationParams {
  return {
    codeChallenge: 'CHALLENGE',
    redirectUri: CLIENT.redirect_uris[0],
    ...overrides,
  };
}

async function authorize(
  provider: SupabaseOAuthProvider,
  client: Awaited<ReturnType<typeof register>>,
  res: FakeRes,
  params: Partial<AuthorizationParams> = {}
): Promise<void> {
  await provider.authorize(client, authorizeParams(params), res as unknown as Response);
}

async function exchangeCode(provider: SupabaseOAuthProvider, client: Awaited<ReturnType<typeof register>>) {
  const session = makeSession('access-1', 'refresh-1', 'user-1');
  state.user = { id: 'user-1', email: 'gui@organizai.local' };
  state.signInPassword = { session, user: session.user };

  const res = makeFakeRes({ method: 'POST', body: { email: 'gui@organizai.local', password: 'segredo' } });
  await authorize(provider, client, res);
  const code = new URL(res.location!).searchParams.get('code')!;
  await provider.exchangeAuthorizationCode(client, code);
}

describe('SupabaseOAuthProvider', () => {
  let provider: SupabaseOAuthProvider;

  beforeEach(() => {
    resetSupabaseState();
    provider = new SupabaseOAuthProvider();
  });

  it('registra e recupera clientes (dynamic client registration)', async () => {
    const registered = await register(provider);
    expect(registered.client_id).toBeTruthy();
    await expect(provider.clientsStore.getClient(registered.client_id)).resolves.toEqual(registered);
  });

  it('GET /authorize renderiza o formulário de login', async () => {
    const client = await register(provider);
    const res = makeFakeRes({ method: 'GET' });

    await authorize(provider, client, res);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<form method="POST"');
    expect(res.text).toContain('CHALLENGE');
    expect(res.text).toContain('response_type');
  });

  it('POST /authorize valida credenciais e emite código com redirect', async () => {
    const client = await register(provider);
    const session = makeSession('access-1', 'refresh-1', 'user-1');
    state.signInPassword = { session, user: session.user };

    const res = makeFakeRes({ method: 'POST', body: { email: 'gui@organizai.local', password: 'segredo' } });
    await authorize(provider, client, res, { state: 'xyz' });

    expect(res.statusCode).toBe(302);
    const location = new URL(res.location!);
    expect(location.origin + location.pathname).toBe(CLIENT.redirect_uris[0]);
    expect(location.searchParams.get('state')).toBe('xyz');
    const code = location.searchParams.get('code');
    expect(code).toBeTruthy();

    await expect(provider.challengeForAuthorizationCode(client, code!)).resolves.toBe('CHALLENGE');
  });

  it('POST /authorize rejeita credenciais inválidas', async () => {
    const client = await register(provider);
    state.signInPassword = { error: { message: 'Invalid login credentials' } };

    const res = makeFakeRes({ method: 'POST', body: { email: 'gui@organizai.local', password: 'errada' } });
    await authorize(provider, client, res);

    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Credenciais inválidas');
    expect(res.location).toBeUndefined();
  });

  it('troca o código por tokens da sessão Supabase (fluxo completo)', async () => {
    const client = await register(provider);
    await exchangeCode(provider, client);

    const info = await provider.verifyAccessToken('access-1');
    expect(info.clientId).toBe(client.client_id);
    expect(info.extra).toEqual({ userId: 'user-1' });

    // /mcp usa o clientId 'manual' para tokens não emitidos pelo authorize
    state.user = { id: 'user-9' };
    const manual = await provider.verifyAccessToken('token-externo');
    expect(manual.clientId).toBe('manual');
    expect(manual.extra).toEqual({ userId: 'user-9' });
  });

  it('renova a sessão via refresh_token e rotaciona o token', async () => {
    const client = await register(provider);
    await exchangeCode(provider, client);

    state.refreshSessionResult = {
      session: makeSession('access-2', 'refresh-2', 'user-1'),
    };
    const tokens = await provider.exchangeRefreshToken(client, 'refresh-1');
    expect(tokens.access_token).toBe('access-2');
    expect(tokens.refresh_token).toBe('refresh-2');

    // refresh antigo rotacionado
    await expect(provider.exchangeRefreshToken(client, 'refresh-1')).rejects.toThrow();
    await expect(provider.verifyAccessToken('access-2')).resolves.toMatchObject({ extra: { userId: 'user-1' } });
  });

  it('revoga tokens e impede uso posterior', async () => {
    const client = await register(provider);
    await exchangeCode(provider, client);

    await provider.revokeToken(client, { token: 'access-1' });
    await expect(provider.verifyAccessToken('access-1')).rejects.toThrow();
  });
});
