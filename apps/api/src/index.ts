import 'dotenv/config';
import { serve } from '@hono/node-server';

import { config } from './config.js';
import { createApp } from './app.js';

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

serve({
  fetch: app.fetch,
  port: config.port,
});

console.log(`🚀 Servidor Backend OrganizAI escutando na porta ${config.port}...`);
console.log(`📄 Documentação Scalar disponível em http://localhost:${config.port}/doc`);
console.log(`🤖 Endpoint LLMs disponível em http://localhost:${config.port}/llms.txt`);
