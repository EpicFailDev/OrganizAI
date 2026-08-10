import 'dotenv/config';
import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';

import { config } from './config.js';
import { createApp } from './app.js';
import { createOAuthAppSingleton, OAUTH_PATHS } from './mcp/auth/index.js';

// Validação de configuração no boot: sem URL/chave anônima o servidor não tem
// como servir dados. Em produção, falha com saída não-zero (o orchestrator
// reinicia e o operador vê o erro no log). A service role key NUNCA é aceita
// como fallback da anon key (ela burlaria o RLS).
if (!config.supabase.url || !config.supabase.anonKey) {
  console.error(
    'Configuração do Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou SUPABASE_URL / SUPABASE_ANON_KEY).'
  );
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const app = createApp();
const oauthApp = createOAuthAppSingleton();

// Dispatcher: o SDK OAuth do MCP é Express-based e precisa ser montado na raiz
// (/authorize, /token, /register, /revoke, /.well-known/*). Encaminhamos esses
// caminhos para a app Express e todo o resto para a app Hono.
//
// getRequestListener preserva o env `{ incoming, outgoing }` que o
// `getConnInfo` (rate limit por IP) lê — mesmo comportamento do serve() atual.
const honoListener = getRequestListener(app.fetch);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const isOAuth = OAUTH_PATHS.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
  if (isOAuth) {
    return oauthApp(req, res);
  }
  return honoListener(req, res);
});

server.listen(config.port);

console.log(`🚀 Servidor Backend OrganizAI escutando na porta ${config.port}...`);
console.log(`📄 Documentação Scalar disponível em http://localhost:${config.port}/doc`);
console.log(`🤖 Endpoint LLMs disponível em http://localhost:${config.port}/llms.txt`);
console.log(`🔐 OAuth MCP disponível em ${config.oauth.issuerUrl}/.well-known/oauth-authorization-server`);
