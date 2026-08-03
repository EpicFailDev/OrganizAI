const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Normaliza "12,90" ou "12.90" para número (vírgula pt-BR). */
export function parseNumber(value: string): number {
  const normalized = String(value).trim().replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}
