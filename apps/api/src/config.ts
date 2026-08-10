/**
 * Configuração centralizada do backend.
 *
 * Todas as variáveis de ambiente são lidas aqui (com defaults seguros), de modo
 * que o restante do código dependa apenas de `config` — sem `process.env`
 * espalhado pelos módulos.
 */
const env = process.env;

/** Converte um valor de ambiente em número, falhando claramente em NaN. */
function envInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Variável de ambiente inválida: ${name}="${value}" não é um número.`);
  }
  return parsed;
}

/** Resolve um booleano de ambiente ('true'/'1' = true). */
function envBool(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export const config = {
  /** Porta HTTP do servidor Hono. */
  port: envInt(env.PORT, 3000, 'PORT'),

  /** Ambiente de execução ('production', 'development', etc.). */
  nodeEnv: env.NODE_ENV || 'development',

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

  /** Servidor de autorização OAuth do MCP (RFC 8414). */
  oauth: {
    /**
     * URL pública do authorization server (issuer). Precisa ser HTTPS em
     * produção (o SDK rejeita HTTP exceto em localhost).
     */
    issuerUrl: env.MCP_OAUTH_ISSUER_URL || env.API_DOC_URL || 'https://doc.organizai.duckdns.org',
    /**
     * E-mails permitidos no login do /authorize (separados por vírgula).
     * Vazio = qualquer usuário válido do Supabase Auth pode autorizar o MCP.
     */
    allowedEmails: (env.MCP_OAUTH_ALLOWED_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  },

  bodyLimitBytes: envInt(env.BODY_LIMIT_BYTES, 1024 * 1024, 'BODY_LIMIT_BYTES'), // 1 MB
  /** Exibição em MB (para mensagens de erro) derivada de bodyLimitBytes. */
  bodyLimitBytesMb: envInt(env.BODY_LIMIT_BYTES, 1024 * 1024, 'BODY_LIMIT_BYTES') / 1024 / 1024,

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
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: envInt(env.CORS_MAX_AGE, 86400, 'CORS_MAX_AGE'),
  },

  rateLimit: {
    windowMs: envInt(env.RATE_LIMIT_WINDOW_MS, 60_000, 'RATE_LIMIT_WINDOW_MS'),
    max: envInt(env.RATE_LIMIT_MAX, 120, 'RATE_LIMIT_MAX'),
    // Habilite apenas quando um proxy reverso próprio sobrescreve
    // X-Forwarded-For em toda requisição (nginx/apache).
    trustProxy: envBool(env.RATE_LIMIT_TRUST_PROXY),
  },
};
