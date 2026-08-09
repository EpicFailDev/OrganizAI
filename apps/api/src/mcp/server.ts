import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';

/**
 * Fábrica do servidor MCP do OrganizAI.
 *
 * As mesmas ferramentas são usadas tanto pelo transporte STDIO (CLI/CI) quanto
 * pelo transporte HTTP Streamable (/mcp), garantindo comportamento idêntico.
 *
 * O cliente Supabase pode ser injetado para que as chamadas respeitem a RLS do
 * usuário autenticado (transporte HTTP). Se omitido, usa o cliente padrão
 * (anon), que só enxerga dados públicos/da própria família via token.
 */
export function createMcpServer(client: SupabaseClient = supabase): McpServer {
  const server = new McpServer({
    name: 'OrganizAI MCP Backend',
    version: '1.0.0',
  });

  // Ferramenta 1: Obter resumo financeiro de uma família
  server.tool(
    'get_financial_summary',
    'Retorna o balanço financeiro consolidado de receitas, despesas e saldo atual de uma família no OrganizAI',
    {
      family_id: z
        .string()
        .uuid()
        .describe('UUID da família cujo resumo financeiro deve ser calculado'),
    },
    async ({ family_id }) => {
      const { data: txs, error } = await client
        .from('transactions')
        .select('amount, type')
        .eq('family_id', family_id);

      if (error) {
        return {
          content: [{ type: 'text', text: `Erro ao buscar dados: ${error.message}` }],
          isError: true,
        };
      }

      let totalExpenses = 0;
      let totalIncome = 0;

      (txs || []).forEach((t: { amount: number; type: string }) => {
        if (t.type === 'expense') totalExpenses += Number(t.amount || 0);
        if (t.type === 'income') totalIncome += Number(t.amount || 0);
      });

      const summary = {
        total_expenses: Number(totalExpenses.toFixed(2)),
        total_income: Number(totalIncome.toFixed(2)),
        net_balance: Number((totalIncome - totalExpenses).toFixed(2)),
        total_transactions: txs?.length || 0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }
  );

  // Ferramenta 2: Listar últimas transações de uma família
  server.tool(
    'list_transactions',
    'Lista as últimas transações financeiras de uma família no OrganizAI',
    {
      family_id: z
        .string()
        .uuid()
        .describe('UUID da família cujas transações devem ser listadas'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10)
        .describe('Quantidade máxima de transações a retornar (padrão 10)'),
    },
    async ({ family_id, limit }) => {
      const { data, error } = await client
        .from('transactions')
        .select('id, description, amount, type, date, time, category_id, subcategory_id, created_by')
        .eq('family_id', family_id)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          content: [{ type: 'text', text: `Erro: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data || [], null, 2),
          },
        ],
      };
    }
  );

  // Ferramenta 3: Cadastrar nova transação em uma família
  server.tool(
    'add_transaction',
    'Cadastra um novo lançamento financeiro (receita ou despesa) em uma família no OrganizAI',
    {
      family_id: z
        .string()
        .uuid()
        .describe('UUID da família à qual a transação pertence'),
      description: z.string().min(1).describe('Descrição da transação (ex: Almoço, Salário, Conta de Luz)'),
      amount: z.number().positive().describe('Valor em reais'),
      type: z
        .enum(['expense', 'income'])
        .default('expense')
        .describe('Tipo da transação'),
      category_id: z.string().uuid().describe('UUID da categoria da transação'),
      date: z.string().describe('Data no formato YYYY-MM-DD'),
    },
    async ({ family_id, description, amount, type, category_id, date }) => {
      // RLS exige created_by = auth.uid(); resolve o usuário do token injetado.
      const { data: sessionUser, error: authError } = await client.auth.getUser();
      const createdBy = sessionUser?.user?.id;

      if (authError || !createdBy) {
        return {
          content: [
            {
              type: 'text',
              text: 'Autenticação necessária: envie um token JWT válido (Authorization: Bearer <token>).',
            },
          ],
          isError: true,
        };
      }

      const { data, error } = await client
        .from('transactions')
        .insert([{ family_id, description, amount, type, category_id, date, created_by: createdBy }])
        .select()
        .single();

      if (error) {
        return {
          content: [{ type: 'text', text: `Erro ao salvar transação: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Transação cadastrada com sucesso!\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    }
  );

  // Ferramenta 4: Listar categorias disponíveis para uma família
  server.tool(
    'list_categories',
    'Lista as categorias financeiras (padrões globais e personalizadas da família) no OrganizAI',
    {
      family_id: z
        .string()
        .uuid()
        .optional()
        .describe('UUID da família; se omitido, retorna apenas as categorias globais padrão'),
    },
    async ({ family_id }) => {
      const query = client.from('categories').select('*').order('name');

      if (family_id) {
        query.or(`family_id.is.null,family_id.eq.${family_id}`);
      } else {
        query.is('family_id', null);
      }

      const { data, error } = await query;

      if (error) {
        return {
          content: [{ type: 'text', text: `Erro: ${error.message}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data || [], null, 2),
          },
        ],
      };
    }
  );

  return server;
}
