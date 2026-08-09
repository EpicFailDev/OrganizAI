import { describe, expect, it, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMcpServer } from './server.js';

const FAMILY = 'a1b2c3d4-0000-0000-0000-000000000001';
const CATEGORY = 'a1b2c3d4-0000-0000-0000-000000000010';

/** Cria um par cliente/servidor MCP ligados em memória. */
async function connectServer(client: SupabaseClient, options?: { userId?: string }) {
  const server = createMcpServer(client, options);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const mcpClient = new Client({ name: 'test-client', version: '1.0.0' });
  await mcpClient.connect(clientTransport);
  return mcpClient;
}

function callResult(result: unknown) {
  const r = result as { content?: Array<{ text?: string }>; isError?: boolean };
  return {
    content: (r.content ?? []).map((c) => c.text ?? '').join(''),
    isError: r.isError ?? false,
  };
}

describe('Ferramentas MCP', () => {
  let db: SupabaseClient;
  let inserts: unknown[];

  beforeEach(() => {
    inserts = [];
    db = {
      from: viFrom(),
      rpc: viRpc(),
    } as unknown as SupabaseClient;

    function viFrom() {
      return (_table: string) => {
        const chain: any = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          limit: () => chain,
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
          insert: (values: unknown) => {
            inserts.push(values);
            return { ...chain, select: () => ({ ...chain, single: async () => ({ data: values, error: null }) }) };
          },
        };
        return chain;
      };
    }

    function viRpc() {
      return async (fn: string) => {
        if (fn === 'get_financial_summary') {
          return {
            data: [
              { total_income: 300, total_expense: 150, balance: 150, transaction_count: 3, top_category: 'Lazer' },
            ],
            error: null,
          };
        }
        return { data: null, error: null };
      };
    }
  });

  it('get_financial_summary retorna o balanço consolidado', async () => {
    const client = await connectServer(db);
    const result = callResult(await client.callTool({ name: 'get_financial_summary', arguments: { family_id: FAMILY } }));
    const parsed = JSON.parse(result.content);
    expect(result.isError).toBe(false);
    expect(parsed).toEqual({
      total_expenses: 150,
      total_income: 300,
      net_balance: 150,
      total_transactions: 3,
    });
    await client.close();
  });

  it('get_financial_summary retorna erro controlado quando o banco falha', async () => {
    const failingDb = {
      rpc: async () => ({ data: null, error: { code: '42501', message: 'Acesso negado' } }),
    } as unknown as SupabaseClient;

    const client = await connectServer(failingDb);
    const result = callResult(await client.callTool({ name: 'get_financial_summary', arguments: { family_id: FAMILY } }));
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Erro ao buscar dados');
    await client.close();
  });

  it('add_transaction exige autenticação quando não há userId', async () => {
    const client = await connectServer(db);
    const result = callResult(
      await client.callTool({
        name: 'add_transaction',
        arguments: { family_id: FAMILY, description: 'Almoço', amount: 50, type: 'expense', category_id: CATEGORY, date: '2026-08-08' },
      })
    );
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Autenticação necessária');
    expect(inserts).toHaveLength(0);
    await client.close();
  });

  it('add_transaction injeta created_by a partir do userId resolvido', async () => {
    const client = await connectServer(db, { userId: 'user-1' });
    const result = callResult(
      await client.callTool({
        name: 'add_transaction',
        arguments: { family_id: FAMILY, description: 'Almoço', amount: 50, type: 'expense', category_id: CATEGORY, date: '2026-08-08' },
      })
    );
    expect(result.isError).toBe(false);
    expect(result.content).toContain('Transação cadastrada com sucesso');
    expect(inserts[0]).toEqual([
      { family_id: FAMILY, description: 'Almoço', amount: 50, type: 'expense', category_id: CATEGORY, date: '2026-08-08', created_by: 'user-1' },
    ]);
    await client.close();
  });

  it('add_transaction reporta erro de banco com isError', async () => {
    const failingDb = {
      from: () => ({
        select: () => ({ single: async () => ({ data: null, error: { message: 'duplicate' } }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'duplicate' } }) }) }),
      }),
      rpc: async () => ({ data: null, error: null }),
    } as unknown as SupabaseClient;

    const client = await connectServer(failingDb, { userId: 'user-1' });
    const result = callResult(
      await client.callTool({
        name: 'add_transaction',
        arguments: { family_id: FAMILY, description: 'Almoço', amount: 50, type: 'expense', category_id: CATEGORY, date: '2026-08-08' },
      })
    );
    expect(result.isError).toBe(true);
    expect(result.content).toContain('Erro ao salvar transação');
    await client.close();
  });

  it('list_transactions lista transações da família', async () => {
    const rows = [{ id: 'tx-1', description: 'Mercado', amount: 100 }];
    const listingDb = {
      from: () => ({
        select: () => ({
          eq: () => ({ order: () => ({ limit: async () => ({ data: rows, error: null }) }) }),
        }),
      }),
      rpc: async () => ({ data: null, error: null }),
    } as unknown as SupabaseClient;

    const client = await connectServer(listingDb);
    const result = callResult(
      await client.callTool({ name: 'list_transactions', arguments: { family_id: FAMILY, limit: 10 } })
    );
    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content)).toEqual(rows);
    await client.close();
  });

  it('list_categories retorna as categorias da família', async () => {
    const rows = [{ id: CATEGORY, name: 'Alimentação' }];
    const categoriesDb = {
      from: () => {
        const chain: any = {
          select: () => chain,
          order: () => chain,
          is: () => chain,
          or: () => chain,
          then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
        };
        return chain;
      },
      rpc: async () => ({ data: null, error: null }),
    } as unknown as SupabaseClient;

    const client = await connectServer(categoriesDb);
    const result = callResult(
      await client.callTool({ name: 'list_categories', arguments: { family_id: FAMILY } })
    );
    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content)).toEqual(rows);
    await client.close();
  });
});
