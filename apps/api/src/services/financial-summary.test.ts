import { describe, expect, it } from 'vitest';
import { summarizeTransactions, type TransactionRow } from './financial-summary.js';

function row(partial: Partial<TransactionRow> & Pick<TransactionRow, 'type' | 'amount'>): TransactionRow {
  return { categories: null, ...partial };
}

describe('summarizeTransactions', () => {
  it('retorna zero para lista vazia', () => {
    expect(summarizeTransactions([])).toEqual({
      total_expenses: 0,
      total_income: 0,
      net_balance: 0,
      top_category: null,
      transactions_count: 0,
    });
  });

  it('soma despesas e receitas e calcula o saldo', () => {
    const result = summarizeTransactions([
      row({ type: 'expense', amount: 100 }),
      row({ type: 'expense', amount: 50 }),
      row({ type: 'income', amount: 300 }),
    ]);

    expect(result).toEqual({
      total_expenses: 150,
      total_income: 300,
      net_balance: 150,
      top_category: 'Sem categoria',
      transactions_count: 3,
    });
  });

  it('ignora tipos desconhecidos e valores ausentes', () => {
    const result = summarizeTransactions([
      row({ type: 'other' as unknown as 'expense', amount: 999 }),
      row({ type: 'expense', amount: 0 }),
    ]);

    expect(result.total_expenses).toBe(0);
    expect(result.total_income).toBe(0);
    expect(result.transactions_count).toBe(2);
  });

  it('identifica a categoria com maior despesa', () => {
    const result = summarizeTransactions([
      row({ type: 'expense', amount: 40, categories: { name: 'Mercado' } }),
      row({ type: 'expense', amount: 90, categories: { name: 'Lazer' } }),
      row({ type: 'expense', amount: 30, categories: { name: 'Mercado' } }),
    ]);

    expect(result.top_category).toBe('Lazer');
    expect(result.total_expenses).toBe(160);
  });

  it('suporta categoria como array (join .select(categories(name)))', () => {
    const result = summarizeTransactions([
      row({ type: 'expense', amount: 25, categories: [{ name: 'Transporte' }] }),
    ]);

    expect(result.top_category).toBe('Transporte');
  });

  it('arredonda valores para duas casas decimais', () => {
    const result = summarizeTransactions([row({ type: 'expense', amount: 10.005 })]);

    expect(result.total_expenses).toBe(10.01);
  });

  it('retorna top_category null quando não há despesas', () => {
    const result = summarizeTransactions([row({ type: 'income', amount: 500 })]);

    expect(result.top_category).toBeNull();
  });
});
