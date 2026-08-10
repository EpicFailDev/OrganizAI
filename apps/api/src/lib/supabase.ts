import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const { url, anonKey } = config.supabase;

/**
 * Cliente Supabase com a chave anônima.
 *
 * Placeholder quando as envs estão ausentes (ex.: healthcheck em dev) para o
 * servidor subir sem crash. As rotas /v1/* usam o cliente escopado ao token
 * via `createUserClient()` e falharão se não houver env válida.
 *
 * NOTA DE SEGURANÇA: a chave usada aqui é SEMPRE a anônima. A service role
 * key nunca é injetada como `apikey` (ela desativaria o RLS do PostgREST).
 */
export const supabase = createClient(
  url || 'https://supabase-placeholder.invalid',
  anonKey || 'placeholder'
);

/**
 * Cria um cliente Supabase escopado ao token JWT do usuário autenticado.
 *
 * O token é enviado como `Authorization` em todas as requisições, fazendo com
 * que o PostgREST aplique as políticas RLS daquele usuário.
 */
export function createUserClient(accessToken: string) {
  return createClient(
    url || 'https://supabase-placeholder.invalid',
    anonKey || 'placeholder',
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
