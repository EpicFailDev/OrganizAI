import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, UNAUTHENTICATED_MESSAGE } from './errors.js';

/**
 * Variáveis injetadas no contexto de cada request.
 *
 * O middleware de autenticação (`/v1/*`) valida o JWT e injeta um cliente
 * Supabase escopado ao token, de modo que o PostgREST aplique as políticas RLS
 * daquele usuário, além do próprio `userId`.
 */
export type AppEnv = {
  Variables: {
    supabase: SupabaseClient;
    userId?: string;
  };
};

export function getDb(c: { get: (key: 'supabase') => SupabaseClient }): SupabaseClient {
  return c.get('supabase');
}

/**
 * Retorna o id do usuário autenticado ou lança 401.
 *
 * Usar em handlers/middlewares que exigem autenticação, em vez de ler
 * `c.get('userId')` diretamente — falha de forma explícita e consistente.
 */
export function getUserId(c: { get: (key: 'userId') => string | undefined }): string {
  const userId = c.get('userId');
  if (!userId) {
    throw new AppError(401, UNAUTHENTICATED_MESSAGE);
  }
  return userId;
}
