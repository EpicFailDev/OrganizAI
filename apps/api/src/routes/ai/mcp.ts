import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '../../mcp/server.js';
import { createUserClient } from '../../lib/supabase.js';
import { verifyMcpAccessToken } from '../../mcp/auth/index.js';
import type { AppEnv } from '../../lib/request-context.js';

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

// Mapa de usuários por sessão (sessionId -> userId) para revalidar o token em
// cada request da sessão e impedir hijack de sessão.
const sessionUsers = new Map<string, string>();

// Limpeza periódica de sessões que já foram encerradas pelo cliente.
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos
const sessionTimestamps = new Map<string, number>();

function cleanupSessions() {
  const now = Date.now();
  for (const [id, ts] of sessionTimestamps.entries()) {
    if (now - ts > SESSION_TTL_MS) {
      sessions.delete(id);
      sessionTimestamps.delete(id);
      sessionUsers.delete(id);
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

  // Revalida o token JWT em todo request (criação e reutilização de sessão).
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return c.json(
      { error: 'Não autenticado: autorize o agente via OAuth (Authorization: Bearer <token>).' },
      401,
      { 'WWW-Authenticate': 'Bearer' }
    );
  }

  const auth = await verifyMcpAccessToken(token);
  if (!auth) {
    return c.json({ error: 'Token inválido ou expirado' }, 401, { 'WWW-Authenticate': 'Bearer' });
  }
  const userId = auth.userId;

  // Reutiliza a sessão existente, se houver — desde que o token ainda seja
  // válido e pertença ao mesmo usuário da sessão (impede hijack de sessão).
  if (sessionId && sessions.has(sessionId)) {
    if (sessionUsers.get(sessionId) !== userId) {
      sessions.delete(sessionId);
      sessionTimestamps.delete(sessionId);
      sessionUsers.delete(sessionId);
      return c.json({ error: 'Sessão MCP não encontrada' }, 404);
    }
    sessionTimestamps.set(sessionId, Date.now());
    return sessions.get(sessionId)!.handleRequest(req);
  }

  // Caso o cliente informe um sessionId que não conhecemos, responde 404
  // (recomeçar a sessão é responsabilidade do cliente).
  if (sessionId) {
    return c.json({ error: 'Sessão MCP não encontrada' }, 404);
  }

  // Cliente Supabase escopado ao access token OAuth do request
  // (Authorization: Bearer). O token emitido pelo authorize é um JWT do
  // Supabase, então `createUserClient(token)` faz o PostgREST aplicar a RLS do
  // usuário autenticado. Tokens ausentes/inválidos/revogados são rejeitados
  // com 401 (o fluxo OAuth substitui o antigo JWT manual no header).
  const mcpClient = createUserClient(token);

  // Nova sessão: cria o transport com sessionIdGenerator e conecta o McpServer.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      sessions.set(id, transport);
      sessionUsers.set(id, userId);
      sessionTimestamps.set(id, Date.now());
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
      sessionUsers.delete(id);
      sessionTimestamps.delete(id);
    },
  });

  const server = createMcpServer(mcpClient, { userId });
  await server.connect(transport);

  return transport.handleRequest(req);
});

export default mcpApp;
