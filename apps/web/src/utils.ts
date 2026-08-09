const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(value: number): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return currencyFormatter.format(n);
}

/** Normaliza valores numéricos (como "1.500,50", "1500,50", "1500.50", 1500) para number */
export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  let str = String(value).trim();
  if (!str) return 0;

  // Remove símbolos monetários (R$), letras e espaços
  str = str.replace(/[R$\s]/gi, '');

  // Se contém tanto ponto quanto vírgula (ex: "1.500,50" ou "1,500.50")
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // pt-BR: "1.500,50" -> remove ponto, substitui vírgula por ponto -> "1500.50"
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // en-US: "1,500.50" -> remove vírgula -> "1500.50"
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Apenas vírgula: "1500,50" -> "1500.50"
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Apenas ponto: se tiver múltiplos pontos, ex: "1.000.000"
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    }
  }

  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

