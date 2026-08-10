import { vi } from 'vitest';

/**
 * Helpers de teste para mockar o módulo `lib/supabase.js`.
 *
 * O mock expõe um cliente Supabase com `from`/`rpc`/`auth.getUser` controlados
 * por um estado global (`state`), permitindo que os testes configurem os
 * resultados por tabela/RPC e inspecionem a cadeia de chamadas (`state.calls`).
 */

export interface MockResult {
  data: unknown;
  error: { code?: string; message: string } | null;
  count?: number;
}

/** Sessão Supabase fake retornada por signInWithPassword/refreshSession. */
export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
}

export interface MockState {
  /** Usuário retornado por auth.getUser(); null = token inválido. */
  user: { id: string; email?: string } | null;
  /** Resultados por tabela: { data, error, count? } ou função que os produz. */
  tables: Record<string, MockResult | ((table: string) => MockResult)>;
  /** Resultados por RPC: { data, error } ou função que os produz. */
  rpcs: Record<string, MockResult | ((args: unknown) => MockResult)>;
  /** Registro das chamadas de from/rpc, com a cadeia de operações (ops). */
  calls: Array<{
    type: 'from' | 'rpc';
    table?: string;
    fn?: string;
    args?: unknown;
    ops: string[];
  }>;
  /**
   * Resultado de auth.signInWithPassword. Ausente = credenciais inválidas.
   * `{ session, user }` = sucesso; `{ error }` = falha.
   */
  signInPassword?: { session: MockSession; user: MockSession['user'] } | { error: { message: string } };
  /** Resultado de auth.refreshSession. Ausente = falha. */
  refreshSessionResult?: { session: MockSession } | { error: { message: string } };
}

/** Resultado padrão: dados nulos, sem erro. */
export function ok(data: unknown = null, count?: number): MockResult {
  return { data, error: null, ...(count !== undefined ? { count } : {}) };
}

/** Resultado de erro do PostgREST. */
export function err(code: string, message = 'erro'): MockResult {
  return { data: null, error: { code, message } };
}

export const state: MockState = {
  user: { id: 'a1b2c3d4-0000-0000-0000-000000000001', email: 'gui@organizai.local' },
  tables: {},
  rpcs: {},
  calls: [],
};

/** Restaura o estado padrão (usuário autenticado, sem resultados). */
export function resetSupabaseState(): void {
  state.user = { id: 'a1b2c3d4-0000-0000-0000-000000000001', email: 'gui@organizai.local' };
  state.tables = {};
  state.rpcs = {};
  state.calls = [];
  state.signInPassword = undefined;
  state.refreshSessionResult = undefined;
}

/** Query chainable e thenable que registra as operações e resolve o resultado. */
export class MockQuery {
  constructor(private result: MockResult, public ops: string[] = []) {}

  select(cols?: unknown): this {
    this.ops.push(`select:${typeof cols === 'string' ? cols : ''}`);
    return this;
  }
  eq(col: string, val: unknown): this {
    this.ops.push(`eq:${col}=${val}`);
    return this;
  }
  or(expr: unknown): this {
    this.ops.push(`or:${expr}`);
    return this;
  }
  is(col: string, val: unknown): this {
    this.ops.push(`is:${col}=${val}`);
    return this;
  }
  order(col: string, _opts?: unknown): this {
    this.ops.push(`order:${col}`);
    return this;
  }
  range(from: number, to: number): this {
    this.ops.push(`range:${from}-${to}`);
    return this;
  }
  limit(n: number): this {
    this.ops.push(`limit:${n}`);
    return this;
  }
  maybeSingle(): Promise<MockResult> {
    this.ops.push('maybeSingle');
    return Promise.resolve(this.result);
  }
  single(): Promise<MockResult> {
    this.ops.push('single');
    return Promise.resolve(this.result);
  }
  insert(values: unknown): this {
    this.ops.push(`insert:${JSON.stringify(values)}`);
    return this;
  }
  update(values: unknown): this {
    this.ops.push(`update:${JSON.stringify(values)}`);
    return this;
  }
  delete(): this {
    this.ops.push('delete');
    return this;
  }
  then<R>(resolve: (value: MockResult) => R, reject?: (e: unknown) => R): Promise<R> {
    return Promise.resolve(this.result).then(resolve, reject);
  }
  catch<R>(reject: (e: unknown) => R | MockResult): Promise<MockResult | R> {
    return Promise.resolve(this.result).catch(reject);
  }
}
/**
 * Factory do módulo mock de `lib/supabase.js`. Deve ser usado com
 * `vi.mock('../lib/supabase.js', () => import('../test/supabase.js').then((m) => m.buildMockModule()))`.
 */
export function buildMockModule() {
  const client = {
    from: vi.fn((table: string) => {
      const call = { type: 'from' as const, table, ops: [] as string[] };
      state.calls.push(call);
      const spec = state.tables[table];
      const result = typeof spec === 'function' ? spec(table) : (spec ?? ok());
      return new MockQuery(result, call.ops);
    }),
    rpc: vi.fn((fn: string, args: unknown) => {
      const call = { type: 'rpc' as const, fn, args, ops: [] as string[] };
      state.calls.push(call);
      const spec = state.rpcs[fn];
      const result = typeof spec === 'function' ? spec(args) : (spec ?? ok());
      return Promise.resolve(result);
    }),
    auth: {
      getUser: vi.fn(async () => {
        if (state.user === null) {
          return { data: { user: null }, error: { message: 'Token inválido ou expirado' } };
        }
        return { data: { user: state.user }, error: null };
      }),
      signInWithPassword: vi.fn(async (_creds: { email: string; password: string }) => {
        if (state.signInPassword && 'error' in state.signInPassword) {
          return { data: { user: null, session: null }, error: state.signInPassword.error };
        }
        const session = state.signInPassword?.session ?? null;
        return { data: { user: session?.user ?? null, session }, error: null };
      }),
      refreshSession: vi.fn(async (_input: { refresh_token: string }) => {
        if (state.refreshSessionResult && 'error' in state.refreshSessionResult) {
          return { data: { session: null }, error: state.refreshSessionResult.error };
        }
        return { data: { session: state.refreshSessionResult?.session ?? null }, error: null };
      }),
      admin: {
        signOut: vi.fn(async () => ({ error: null })),
      },
    },
  };

  return {
    supabase: client,
    createUserClient: vi.fn(() => client),
  };
}
