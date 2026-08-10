import { z } from '@hono/zod-openapi';

// ----------------------------------------------------
// Resumo Analítico / Insights
// ----------------------------------------------------
export const FinancialAnalyticsSummarySchema = z.object({
  total_expenses: z.number().openapi({ example: 3420.50 }),
  total_income: z.number().openapi({ example: 7500.00 }),
  net_balance: z.number().openapi({ example: 4079.50 }),
  top_category: z.string().nullable().openapi({ example: 'Alimentação' }),
  transactions_count: z.number().openapi({ example: 42 }),
  family_members_count: z.number().openapi({ example: 4 }),
}).openapi('FinancialAnalyticsSummary');
