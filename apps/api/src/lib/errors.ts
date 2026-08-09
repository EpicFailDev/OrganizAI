import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Erro de negócio com status HTTP explícito.
 *
 * Lançado pelos serviços/handlers quando o desfecho é conhecido (ex.: recurso
 * não encontrado, autorização negada). O middleware `onError` do servidor o
 * converte em resposta JSON sem expor stack traces.
 */
export class AppError extends Error {
  readonly statusCode: ContentfulStatusCode;

  constructor(statusCode: ContentfulStatusCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Mapeia erros do PostgREST para códigos HTTP e mensagens amigáveis.
 * Códigos Postgres/PostgREST conhecidos:
 *  - PGRST116: `no rows` em .single()/maybeSingle() → 404
 *  - 42501: violação de RLS / privilégio insuficiente → 403
 *  - 23505: violação de chave única (duplicado) → 409
 *  - 23503: violação de chave estrangeira → 409
 *  - P0001: exceção lançada por RPC (mensagem controlada em pt-BR) → 400
 */
export function toHttpError(error: { code?: string; message: string }): {
  statusCode: ContentfulStatusCode;
  message: string;
} {
  switch (error.code) {
    case 'PGRST116':
      return { statusCode: 404, message: 'Recurso não encontrado' };
    case '42501':
      return { statusCode: 403, message: 'Acesso negado' };
    case '23505':
      return { statusCode: 409, message: 'Registro duplicado' };
    case '23503':
      return { statusCode: 409, message: 'Recurso relacionado não encontrado' };
    case 'P0001':
      return { statusCode: 400, message: error.message };
    default:
      return { statusCode: 500, message: 'Erro interno do servidor' };
  }
}

/** Guard de tipo para erros vindos do PostgREST (possui code/message). */
export function isPostgrestError(error: unknown): error is { code?: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Converte um erro de banco em `AppError` com resposta HTTP limpa (não vaza
 * detalhes internos). Lança em vez de retornar, pois `never` é atribuível a
 * qualquer tipo de retorno — assim handlers tipados (Zod OpenAPI) podem
 * delegar a checagem de erro sem casar com o tipo exato da resposta.
 */
export function dbErrorHandler(error: { code?: string; message: string }): never {
  const { statusCode, message } = toHttpError(error);

  if (statusCode >= 500) {
    console.error('Erro no banco de dados:', error);
  }

  throw new AppError(statusCode, message);
}
