import { describe, expect, it } from 'vitest';
import { CreateTransactionSchema, ErrorResponseSchema } from './index.js';

const UUID = 'a1b2c3d4-0000-0000-0000-000000000001';

describe('CreateTransactionSchema', () => {
  const valid = {
    family_id: UUID,
    description: 'Supermercado',
    amount: 89.9,
    category_id: UUID,
    date: '2026-08-08',
  };

  it('aceita payload mínimo', () => {
    const result = CreateTransactionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('aplica o default do tipo como expense', () => {
    const result = CreateTransactionSchema.safeParse(valid);
    expect(result.success && result.data.type).toBe('expense');
  });

  it('mantém o campo time quando informado', () => {
    const result = CreateTransactionSchema.safeParse({ ...valid, time: '14:30:00' });
    expect(result.success && result.data.time).toBe('14:30:00');
  });

  it('mantém o campo odometer_km quando informado', () => {
    const result = CreateTransactionSchema.safeParse({ ...valid, odometer_km: 124500 });
    expect(result.success && result.data.odometer_km).toBe(124500);
  });

  it('aceita odometer_km nulo ou ausente', () => {
    expect(CreateTransactionSchema.safeParse({ ...valid, odometer_km: null }).success).toBe(true);
    expect(CreateTransactionSchema.safeParse(valid).success).toBe(true);
  });

  it('descarta campos extras como created_by (compatibilidade com o frontend)', () => {
    const result = CreateTransactionSchema.safeParse({
      ...valid,
      created_by: UUID,
    });
    expect(result.success).toBe(true);
    expect('created_by' in (result.success ? result.data : {})).toBe(false);
  });

  it('rejeita valor não positivo', () => {
    expect(CreateTransactionSchema.safeParse({ ...valid, amount: -1 }).success).toBe(false);
  });

  it('rejeita descrição vazia', () => {
    expect(CreateTransactionSchema.safeParse({ ...valid, description: '' }).success).toBe(false);
  });
});

describe('ErrorResponseSchema', () => {
  it('aceita apenas o campo error', () => {
    const result = ErrorResponseSchema.safeParse({ error: 'Recurso não encontrado' });
    expect(result.success).toBe(true);
  });
});
