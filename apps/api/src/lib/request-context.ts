import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Variáveis injetadas no contexto de cada request pelo middleware de auth
 * em `index.ts`. O cliente é escopado ao token JWT do usuário, de modo que
 * o PostgREST aplique as políticas RLS daquele usuário.
 */
export type AppEnv = {
  Variables: {
    supabase: SupabaseClient;
    /** ID do usuário autenticado (auth.uid()) extraído do JWT validado. */
    userId?: string;
  };
};

export function getDb(c: { get: (key: 'supabase') => SupabaseClient }): SupabaseClient {
  return c.get('supabase');
}
