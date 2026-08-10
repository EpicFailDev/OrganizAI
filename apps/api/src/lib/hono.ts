import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { AppEnv } from './request-context.js';
import { VALIDATION_ERROR_MESSAGE } from './errors.js';

/**
 * defaultHook global: normaliza TODAS as falhas de validação (query/params/body)
 * do zod-openapi para o formato padrão `{ error }`. Sem ele, cada rota retornaria
 * o objeto completo do safeParse do zod, contrariando o contrato documentado.
 */
export function validationHook(result: { success: boolean }, c: Context): Response | void {
  if (!result.success) {
    return c.json({ error: VALIDATION_ERROR_MESSAGE }, 400);
  }
}

/** Cria uma sub-app Hono+Zod OpenAPI com o hook de validação padrão aplicado. */
export function createApiApp(): OpenAPIHono<AppEnv> {
  return new OpenAPIHono<AppEnv>({ defaultHook: validationHook });
}
