import { describe, expect, it, vi } from 'vitest';
import { AppError, dbErrorHandler, isPostgrestError, toHttpError } from './errors.js';

describe('toHttpError', () => {
  it.each([
    [{ code: 'PGRST116', message: 'no rows' }, 404, 'Recurso não encontrado'],
    [{ code: '42501', message: 'permission denied' }, 403, 'Acesso negado'],
    [{ code: '23505', message: 'duplicate key' }, 409, 'Registro duplicado'],
    [{ code: '23503', message: 'foreign key' }, 409, 'Recurso relacionado não encontrado'],
  ])('mapeia %o para %i', (error, status, message) => {
    expect(toHttpError(error)).toEqual({ statusCode: status, message });
  });

  it('propaga a mensagem controlada de RPC (P0001)', () => {
    const { statusCode, message } = toHttpError({ code: 'P0001', message: 'Saldo insuficiente' });
    expect(statusCode).toBe(400);
    expect(message).toBe('Saldo insuficiente');
  });

  it('cai em 500 para códigos desconhecidos', () => {
    expect(toHttpError({ code: 'XX99', message: 'boom' }).statusCode).toBe(500);
  });

  it('cai em 500 quando não há código', () => {
    expect(toHttpError({ message: 'network error' }).statusCode).toBe(500);
  });
});

describe('isPostgrestError', () => {
  it('reconhece erros com message string', () => {
    expect(isPostgrestError({ message: 'x', code: 'PGRST116' })).toBe(true);
  });

  it('rejeita valores não-objete e message ausente', () => {
    expect(isPostgrestError(null)).toBe(false);
    expect(isPostgrestError('erro')).toBe(false);
    expect(isPostgrestError({ code: 'PGRST116' })).toBe(false);
    expect(isPostgrestError(new Error('x'))).toBe(true);
  });
});

describe('dbErrorHandler', () => {
  it('lança AppError com status e mensagem mapeados', () => {
    expect(() => dbErrorHandler({ code: 'PGRST116', message: 'no rows' })).toThrowError(
      new AppError(404, 'Recurso não encontrado')
    );
  });

  it('não vaza a mensagem interna do Postgres para 500', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      dbErrorHandler({ message: 'relation "users" does not exist' });
      throw new Error('deveria ter lançado');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(500);
      expect((error as AppError).message).toBe('Erro interno do servidor');
    } finally {
      spy.mockRestore();
    }
  });
});
