import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY não definidos em .env');
}

// Placeholder somente para o servidor subir sem crash quando as envs estiverem
// ausentes (ex.: healthcheck em ambiente de dev). As rotas /v1/* usam o
// cliente escopado ao token via createUserClient() e falharão se não houver env.
export const supabase = createClient(
  supabaseUrl || 'https://supabase-placeholder.invalid',
  supabaseKey || 'placeholder'
);

/**
 * Cria um cliente Supabase escopado ao token JWT do usuário autenticado.
 * O token é enviado como `Authorization` em todos os requests, fazendo com
 * que o PostgREST aplique as políticas RLS daquele usuário.
 */
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseKey, {
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
  });
}
