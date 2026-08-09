import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '../mcp/server.js';
import { supabase, createUserClient } from '../lib/supabase.js';
import type { AppEnv } from '../lib/request-context.js';

// Endpoint HTTP do Model Context Protocol (Streamable HTTP).
//
// Permite que Agentes de IA (Claude, Cursor, etc.) consumam as ferramentas do
// OrganizAI por URL, sem depender do transporte STDIO. Dois modos:
//   - Stateless: sem sessionIdGenerator (cada request é autossuficiente)
//   - Stateful:  com sessionIdGenerator (sessões SSE reutilizáveis)
//
// Aqui usamos Stateful com gestão de sessões em memória, compatível com os
// clientes MCP que negociam initialize/notifications via HTTP.
//
// NOTA: o rate limit de /mcp é aplicado pela app principal (app.ts), evitando
// dupla contagem e mantendo o bucket por instância da app (não por singleton).

const mcpApp = new Hono<AppEnv>();

// Mapa de sessões MCP ativas (sessionId -> transport).
const sessions = new Map<string, WebStandardStreamableHTTPServerTransport>();

// Limpeza periódica de sessões que já foram encerradas pelo cliente.
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos
const sessionTimestamps = new Map<string, number>();

function cleanupSessions() {
  const now = Date.now();
  for (const [id, ts] of sessionTimestamps.entries()) {
    if (now - ts > SESSION_TTL_MS) {
      sessions.delete(id);
      sessionTimestamps.delete(id);
    }
  }
}

// Limpeza periódica mesmo sem tráfego em /mcp (evita retenção de memória).
setInterval(cleanupSessions, 60_000).unref?.();

// Rota única do MCP: aceita POST (JSON-RPC), GET (SSE) e DELETE (encerrar sessão).
mcpApp.all('/mcp', async (c) => {
  cleanupSessions();

  const req = c.req.raw;
  const sessionId = req.headers.get('mcp-session-id') || undefined;

  // Reutiliza a sessão existente, se houver.
  if (sessionId && sessions.has(sessionId)) {
    sessionTimestamps.set(sessionId, Date.now());
    return sessions.get(sessionId)!.handleRequest(req);
  }

  // Caso o cliente informe um sessionId que não conhecemos, responde 404
  // (recomeçar a sessão é responsabilidade do cliente).
  if (sessionId) {
    return new Response('Sessão MCP não encontrada', { status: 404 });
  }

  // Cliente Supabase escopado ao token JWT do request (Authorization: Bearer),
  // para que as ferramentas MCP respeitem a RLS do usuário autenticado.
  // O userId resolvido é injetado no servidor MCP (a ferramenta add_transaction
  // o usa para preencher created_by sem depender de sessão do supabase-js).
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  let userId: string | undefined;
  let mcpClient = c.get('supabase');
  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user) {
      userId = data.user.id;
      mcpClient = createUserClient(token);
    }
  }

  // Nova sessão: cria o transport com sessionIdGenerator e conecta o McpServer.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, transport);
      sessionTimestamps.set(id, Date.now());
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
      sessionTimestamps.delete(id);
    },
  });

  const server = createMcpServer(mcpClient, { userId });
  await server.connect(transport);

  return transport.handleRequest(req);
});

export default mcpApp;
