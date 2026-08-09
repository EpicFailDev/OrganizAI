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
    // IMPORTANTE (segurança): NUNCA usar SUPABASE_SERVICE_ROLE_KEY como chave
    // do cliente. A service role key burla o RLS e, se fosse injetada como
    // `apikey`, qualquer usuário autenticado acessaria dados de todas as
    // famílias. O fluxo HTTP usa apenas a chave anônima + token do usuário.
    anonKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '',
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
    // Default restrito: origens de desenvolvimento e os domínios oficiais.
    // Em produção, sobrescreva com CORS_ORIGIN (separado por vírgula) se o
    // frontend consumir a API de outra origem.
    origin: env.CORS_ORIGIN
      ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://organizai.duckdns.org',
          'https://doc.organizai.duckdns.org',
        ],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  },

  rateLimit: {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(env.RATE_LIMIT_MAX || 120),
  },
};
