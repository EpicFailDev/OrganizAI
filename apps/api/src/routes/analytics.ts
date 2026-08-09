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
  const { data: txs, error } = await db
    .from('transactions')
    .select('amount, type');

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  let totalExpenses = 0;
  let totalIncome = 0;

  (txs || []).forEach((t: { amount: number; type: string }) => {
    if (t.type === 'expense') totalExpenses += Number(t.amount || 0);
    if (t.type === 'income') totalIncome += Number(t.amount || 0);
  });

  return c.json({
    total_expenses: Number(totalExpenses.toFixed(2)),
    total_income: Number(totalIncome.toFixed(2)),
    net_balance: Number((totalIncome - totalExpenses).toFixed(2)),
    top_category: 'Alimentação',
    transactions_count: txs?.length || 0,
    family_members_count: 4,
  }, 200);
});

export default analyticsApp;
