import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Mensagens de Erro
// ----------------------------------------------------
export const ErrorResponseSchema = z.object({
  error: z.string().openapi({ example: 'Recurso não encontrado ou erro de autenticação' }),
}).openapi('ErrorResponse');

// Validação de formato para datas (AAAA-MM-DD) e horas (HH:MM:SS). Campos
// inválidos são rejeitados com 400 antes de chegarem ao banco (que, de outra
// forma, retornaria erro de cast mapeado como 500).
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const isoDate = (message = 'Data deve estar no formato AAAA-MM-DD') =>
  z.string().regex(ISO_DATE_RE, message);
export const isoTime = (message = 'Horário deve estar no formato HH:MM:SS') =>
  z.string().regex(ISO_TIME_RE, message);

// Refs para colunas embutidas (joins) — tipam as listagens sem usar z.any().
export const CategoryRefSchema = z.object({
  name: z.string(),
  color: z.string().nullable().optional(),
}).nullable().optional();

export const SubcategoryRefSchema = z.object({
  name: z.string(),
}).nullable().optional();

export const ProfileRefSchema = z.object({
  display_name: z.string(),
}).nullable().optional();

export const ProductRefSchema = z.object({
  name: z.string(),
}).nullable().optional();
