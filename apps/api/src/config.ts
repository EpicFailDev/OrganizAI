/**
 * Configuração centralizada do backend.
 *
 * Todas as variáveis de ambiente são lidas aqui (com defaults seguros), de modo
 * que o restante do código dependa apenas de `config` — sem `process.env`
 * espalhado pelos módulos.
 */
const env = process.env;

export const config = {
  /** Porta HTTP do servidor Hono. */
  port: Number(env.PORT || 3000),

  supabase: {
    url: env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
    // Anon key é suficiente para as rotas /v1 (RLS escopa os dados por token).
    // A service role key só deve ser usada em operações administrativas fora
    // do fluxo HTTP de usuário autenticado.
    anonKey:
      env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  /** Servidores divulgados na especificação OpenAPI. */
  docServers: [
    {
      url: env.API_DOC_URL || 'https://doc.organizai.duckdns.org',
      description: 'Subdomínio Oficial de Documentação & API',
    },
    {
      url: env.API_URL || 'https://organizai.duckdns.org/api',
      description: 'Proxy da API Principal',
    },
    { url: 'http://localhost:3000', description: 'Ambiente de Desenvolvimento Local' },
  ],

  bodyLimitBytes: 1024 * 1024, // 1 MB

  cors: {
    origin: env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  },

  rateLimit: {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(env.RATE_LIMIT_MAX || 120),
  },
};
