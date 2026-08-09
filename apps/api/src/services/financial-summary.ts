import type { SupabaseClient } from '@supabase/supabase-js';

export interface FinancialSummary {
  total_expenses: number;
  total_income: number;
  net_balance: number;
  top_category: string | null;
  transactions_count: number;
}

/** Linha retornada pelo select agregado de transações (fallback). */
export interface TransactionRow {
  amount: number;
  type: string;
  categories?: { name?: string } | Array<{ name?: string }> | null;
}

/** Resumo zerado (família sem transações). */
export function emptySummary(): FinancialSummary {
  return {
    total_expenses: 0,
    total_income: 0,
    net_balance: 0,
    top_category: null,
    transactions_count: 0,
  };
}

/**
 * Calcula o resumo financeiro de uma família de forma agregada no banco.
 *
 * Chama a RPC `get_financial_summary` (agregação em SQL — uma única query),
 * evitando transferir todas as transações para o servidor. Fonte única da
 * lógica de resumo, compartilhada entre a rota REST `/v1/analytics/summary` e
 * a ferramenta MCP `get_financial_summary`.
 *
 * Se a RPC ainda não estiver aplicada no banco (PGRST202), cai no fallback em
 * memória (`summarizeTransactions`) para não quebrar durante o rollout.
 */
export async function computeFinancialSummary(
  db: SupabaseClient,
  familyId: string
): Promise<FinancialSummary> {
  const { data, error } = await db.rpc('get_financial_summary', {
    p_family_id: familyId,
  });

  if (error) {
    if (error.code === 'PGRST202') {
      return summarizeFromTable(db, familyId);
    }
    throw error;
  }

  const row = data?.[0];
  if (!row) return emptySummary();

  return {
    total_expenses: round2(Number(row.total_expense)),
    total_income: round2(Number(row.total_income)),
    net_balance: round2(Number(row.balance)),
    top_category: (row.top_category as string | null | undefined) ?? null,
    transactions_count: Number(row.transaction_count),
  };
}

/** Fallback: agrega em memória quando a RPC agregadora ainda não existe. */
async function summarizeFromTable(db: SupabaseClient, familyId: string): Promise<FinancialSummary> {
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
