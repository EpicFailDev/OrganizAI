import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { getDb } from '../lib/request-context.js';
import type { AppEnv } from '../lib/request-context.js';
import { FinancialAnalyticsSummarySchema, ErrorResponseSchema } from '../schemas/index.js';

const analyticsApp = new OpenAPIHono<AppEnv>();

const summaryRoute = createRoute({
  method: 'get',
  path: '/v1/analytics/summary',
  summary: 'Resumo Financeiro da Família',
  description: 'Retorna um balanço consolidado de despesas, receitas, saldo e métricas gerais.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FinancialAnalyticsSummarySchema,
        },
      },
      description: 'Resumo calculado com sucesso',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
      description: 'Erro ao calcular métricas',
    },
  },
});

analyticsApp.openapi(summaryRoute, async (c) => {
  const db = getDb(c);
  const userId = c.get('userId');

  // Identifica a família do usuário logado a partir da associação mais antiga.
  const { data: membership, error: membershipError } = await db
    .from('family_members')
    .select('family_id')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return c.json({ error: membershipError.message }, 500);
  }

  const familyId = membership?.family_id;
  if (!familyId) {
    return c.json({
      total_expenses: 0,
      total_income: 0,
      net_balance: 0,
      top_category: null,
      transactions_count: 0,
      family_members_count: 0,
    }, 200);
  }

  const { data: txs, error } = await db
    .from('transactions')
    .select('amount, type, categories(name)')
    .eq('family_id', familyId);

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  let totalExpenses = 0;
  let totalIncome = 0;
  const categoryTotals = new Map<string, number>();

  (txs || []).forEach((t: { amount: number; type: string; categories?: { name?: string } | Array<{ name?: string }> | null }) => {
    const amount = Number(t.amount || 0);
    if (t.type === 'expense') {
      totalExpenses += amount;
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      const name = cat?.name || 'Sem categoria';
      categoryTotals.set(name, (categoryTotals.get(name) || 0) + amount);
    }
    if (t.type === 'income') totalIncome += amount;
  });

  let topCategory: string | null = null;
  let topValue = 0;
  for (const [name, value] of categoryTotals.entries()) {
    if (value > topValue) {
      topValue = value;
      topCategory = name;
    }
  }

  const { count: familyMembersCount } = await db
    .from('family_members')
    .select('profile_id', { count: 'exact', head: true })
    .eq('family_id', familyId);

  return c.json({
    total_expenses: Number(totalExpenses.toFixed(2)),
    total_income: Number(totalIncome.toFixed(2)),
    net_balance: Number((totalIncome - totalExpenses).toFixed(2)),
    top_category: topCategory,
    transactions_count: txs?.length || 0,
    family_members_count: familyMembersCount || 0,
  }, 200);
});

export default analyticsApp;
