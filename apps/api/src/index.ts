import { OpenAPIHono } from '@hono/zod-openapi';
import { serve } from '@hono/node-server';
import { apiReference } from '@scalar/hono-api-reference';
import dotenv from 'dotenv';

import healthApp from './routes/health.js';
import transactionsApp from './routes/transactions.js';
import categoriesApp from './routes/categories.js';
import analyticsApp from './routes/analytics.js';
import familyApp from './routes/family.js';
import goalsApp from './routes/goals.js';
import budgetsApp from './routes/budgets.js';
import planningApp from './routes/planning.js';
import ingredientsApp from './routes/ingredients.js';
import recipesApp from './routes/recipes.js';
import productsApp from './routes/products.js';
import salesApp from './routes/sales.js';
import receiptItemsApp from './routes/receipt-items.js';
import llmsApp from './routes/llms.js';
import mcpApp from './routes/mcp.js';

import { cors } from 'hono/cors';
import { supabase, createUserClient } from './lib/supabase.js';
import type { AppEnv } from './lib/request-context.js';

dotenv.config();

const app = new OpenAPIHono<AppEnv>();

// Middleware CORS nativo do Hono
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware de autenticação: extrai o JWT do usuário e cria um cliente
// Supabase escopado ao token, de modo que o PostgREST aplique as políticas RLS.
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  c.set('supabase', token ? createUserClient(token) : supabase);
  await next();
});

// Acopla as sub-aplicações com documentação Zod OpenAPI
app.route('/', healthApp);
app.route('/', transactionsApp);
app.route('/', categoriesApp);
app.route('/', analyticsApp);
app.route('/', familyApp);
app.route('/', goalsApp);
app.route('/', budgetsApp);
app.route('/', planningApp);
app.route('/', ingredientsApp);
app.route('/', recipesApp);
app.route('/', productsApp);
app.route('/', salesApp);
app.route('/', receiptItemsApp);
app.route('/', llmsApp);
app.route('/', mcpApp);

// ----------------------------------------------------
// Especificação OpenAPI 3.0 em JSON
// ----------------------------------------------------
app.doc('/doc/json', {
  openapi: '3.0.0',
  info: {
    title: 'OrganizAI Backend API & MCP Protocol Specification',
    version: '1.0.0',
    description: `API oficial do OrganizAI para consumo do Frontend React, Aplicativos Móveis e Agentes de IA via Protocolo MCP.

### Recursos Disponíveis:
- **REST Endpoints**: CRUD de transações, categorias, orçamentos e relatórios analíticos.
- **Documentação de IA (/llms.txt)**: Guia em Markdown limpo para LLMs.
- **Servidor MCP**: Integrado via STDIO e HTTP (Streamable HTTP em \`/mcp\`) para execução autônoma de ferramentas por Agentes de IA.`,
  },
  servers: [
    {
      url: 'https://doc.organizai.duckdns.org',
      description: 'Subdomínio Oficial de Documentação & API',
    },
    {
      url: 'https://organizai.duckdns.org/api',
      description: 'Proxy da API Principal',
    },
    {
      url: 'http://localhost:3000',
      description: 'Ambiente de Desenvolvimento Local',
    },
  ],
});

// Configuração do servidor MCP para descoberta por clientes
app.get('/mcp.json', (c) => {
  return c.json({
    name: 'OrganizAI MCP',
    version: '1.0.0',
    transport: 'streamable-http',
    url: '/mcp',
    description:
      'Ferramentas MCP do OrganizAI para consulta de dados financeiros da família (resumo, transações, categorias).',
    tools: ['get_financial_summary', 'list_transactions', 'add_transaction', 'list_categories'],
  });
});

// Alias estático para /openapi.json
app.get('/openapi.json', (c) => c.redirect('/doc/json'));

// ----------------------------------------------------
// UI da Documentação Interativa com Scalar
// ----------------------------------------------------
app.get(
  '/doc',
  apiReference({
    theme: 'purple',
    spec: {
      url: '/doc/json',
    },
    pageTitle: 'OrganizAI API Documentation',
  })
);

app.get('/docs', (c) => c.redirect('/doc'));

// Redirecionamento da raiz da doc para /doc se acessado isoladamente
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>OrganizAI API & Documentation</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; height: 100vh; align-items: center; justify-content: center; margin: 0; text-align: center; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; max-width: 500px; }
          h1 { color: #a855f7; margin-bottom: 0.5rem; }
          a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #9333ea; color: white; border-radius: 0.5rem; text-decoration: none; font-weight: bold; }
          a:hover { background: #7e22ce; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>OrganizAI API</h1>
          <p>Serviço backend documentado e compatível com MCP (Model Context Protocol).</p>
          <a href="/doc">Acessar Documentação Interativa (Scalar)</a>
          <br><br>
          <small><a href="/llms.txt" style="background:transparent; color:#94a3b8; padding:0;">Ver /llms.txt para Agentes de IA</a></small>
        </div>
      </body>
    </html>
  `);
});

const port = Number(process.env.PORT || 3000);

console.log(`🚀 Servidor Backend OrganizAI escutando na porta ${port}...`);
console.log(`📄 Documentação Scalar disponível em http://localhost:${port}/doc`);
console.log(`🤖 Endpoint LLMs disponível em http://localhost:${port}/llms.txt`);

serve({
  fetch: app.fetch,
  port,
});
