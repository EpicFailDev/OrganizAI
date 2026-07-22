import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const queryCache = new Map<string, { data: any; ts: number }>();

export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<{ data: T | null; error: any }>,
  ttl = 15000,
): Promise<{ data: T | null; error: any }> {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.ts < ttl) {
    return { data: cached.data as T, error: null };
  }
  const result = await fetcher();
  if (result.data) {
    queryCache.set(key, { data: result.data, ts: Date.now() });
  }
  return result;
}
