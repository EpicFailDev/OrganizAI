import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '../mcp/server.js';

// Endpoint HTTP do Model Context Protocol (Streamable HTTP).
//
// Permite que Agentes de IA (Claude, Cursor, etc.) consumam as ferramentas do
// OrganizAI por URL, sem depender do transporte STDIO. Dois modos:
//   - Stateless: sem sessionIdGenerator (cada request é autossuficiente)
//   - Stateful:  com sessionIdGenerator (sessões SSE reutilizáveis)
//
// Aqui usamos Stateful com gestão de sessões em memória, compatível com os
// clientes MCP que negociam initialize/notifications via HTTP.

const mcpApp = new Hono();

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

  const server = createMcpServer();
  await server.connect(transport);

  return transport.handleRequest(req);
});

export default mcpApp;
