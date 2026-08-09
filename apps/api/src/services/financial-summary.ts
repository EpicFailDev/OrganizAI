import type { SupabaseClient } from '@supabase/supabase-js';

export interface FinancialSummary {
  total_expenses: number;
  total_income: number;
  net_balance: number;
  top_category: string | null;
  transactions_count: number;
}

/** Linha retornada pelo select agregado de transações. */
export interface TransactionRow {
  amount: number;
  type: string;
  categories?: { name?: string } | Array<{ name?: string }> | null;
}

/**
 * Calcula o resumo financeiro de uma família diretamente do banco.
 *
 * Fonte única da lógica de agregação, compartilhada entre a rota REST
 * `/v1/analytics/summary` e a ferramenta MCP `get_financial_summary`.
 */
export async function computeFinancialSummary(
  db: SupabaseClient,
  familyId: string
): Promise<FinancialSummary> {
  const { data: transactions, error } = await db
    .from('transactions')
    .select('amount, type, categories(name)')
    .eq('family_id', familyId);

  if (error) throw error;

  return summarizeTransactions(transactions || []);
}

/** Agregação pura (testável) sobre as linhas de transação. */
export function summarizeTransactions(transactions: TransactionRow[]): FinancialSummary {
  let totalExpenses = 0;
  let totalIncome = 0;
  const categoryTotals = new Map<string, number>();

  for (const t of transactions) {
    const amount = Number(t.amount || 0);

    if (t.type === 'expense') {
      totalExpenses += amount;
      const category = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      const name = category?.name || 'Sem categoria';
      categoryTotals.set(name, (categoryTotals.get(name) || 0) + amount);
    } else if (t.type === 'income') {
      totalIncome += amount;
    }
  }

  let topCategory: string | null = null;
  let topValue = 0;
  for (const [name, value] of categoryTotals.entries()) {
    if (value > topValue) {
      topValue = value;
      topCategory = name;
    }
  }

  return {
    total_expenses: round2(totalExpenses),
    total_income: round2(totalIncome),
    net_balance: round2(totalIncome - totalExpenses),
    top_category: topCategory,
    transactions_count: transactions.length,
  };
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}
