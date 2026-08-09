import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp/server.js';

// Servidor MCP via STDIO (execução local / CI / ferramentas de linha de comando).
// Para consumo remoto via HTTP, use o endpoint Streamable HTTP em /mcp.
async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🚀 Servidor MCP OrganizAI rodando via STDIO...');
}

main().catch((err) => {
  console.error('Erro no servidor MCP:', err);
  process.exit(1);
});
