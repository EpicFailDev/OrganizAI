import { vi } from 'vitest';

/**
 * Setup global dos testes de integração: substitui o módulo `lib/supabase.js`
 * pelo mock controlado em `./supabase.ts`, para que `app.request()` não tente
 * conversar com o Supabase real. Cada teste reseta o estado via
 * `resetSupabaseState()` no seu `beforeEach`.
 */
vi.mock('../lib/supabase.js', () => import('./supabase.js').then((m) => m.buildMockModule()));
