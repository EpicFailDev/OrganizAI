import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { getDb, getUserId } from '../../lib/request-context.js';
import type { AppEnv } from '../../lib/request-context.js';
import { dbErrorHandler, isPostgrestError } from '../../lib/errors.js';
import { computeFinancialSummary, emptySummary } from '../../services/financial-summary.js';
import { FinancialAnalyticsSummarySchema, ErrorResponseSchema } from '../../schemas/index.js';

const analyticsApp = new OpenAPIHono<AppEnv>();

const summaryRoute = createRoute({
  method: 'get',
  path: '/v1/analytics/summary',
  summary: 'Resumo Financeiro da Família',
  description: 'Retorna um balanço consolidado de despesas, receitas, saldo e métricas gerais.',
  responses: {
    200: {
      content: { 'application/json': { schema: FinancialAnalyticsSummarySchema } },
      description: 'Resumo calculado com sucesso',
    },
    500: {
      content: { 'application/json': { schema: ErrorResponseSchema } },
      description: 'Erro ao calcular métricas',
    },
  },
});

analyticsApp.openapi(summaryRoute, async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  // Identifica a família do usuário logado a partir da associação mais antiga
  // (determinístico: join mais antigo) para usuários em múltiplas famílias.
  const { data: membership, error: membershipError } = await db
    .from('family_members')
    .select('family_id')
    .eq('profile_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (membershipError) return dbErrorHandler(membershipError);

  const familyId = membership?.family_id;
  if (!familyId) {
    return c.json({ ...emptySummary(), family_members_count: 0 }, 200);
  }

  let summary;
  try {
    summary = await computeFinancialSummary(db, familyId);
  } catch (error) {
    if (!isPostgrestError(error)) throw error;
    return dbErrorHandler(error);
  }

  const { count: familyMembersCount } = await db
    .from('family_members')
    .select('profile_id', { count: 'exact', head: true })
    .eq('family_id', familyId);

  return c.json({ ...summary, family_members_count: familyMembersCount || 0 }, 200);
});

export default analyticsApp;
