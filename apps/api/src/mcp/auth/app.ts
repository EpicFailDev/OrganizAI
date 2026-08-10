import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import type { SupabaseOAuthProvider } from './provider.js';

export interface OAuthAppOptions {
  /** URL pública do authorization server (ex.: https://doc.organizai.duckdns.org). */
  issuerUrl: string;
  /** URL de documentação human-readable do serviço. */
  serviceDocumentationUrl?: string;
}

/**
 * Constrói a aplicação Express com os endpoints OAuth do MCP.
 *
 * O SDK exige que o router seja montado na raiz (``app.use(mcpAuthRouter(...))``),
 * registrando: /authorize, /token, /register, /revoke e os metadados
 * .well-known (RFC 8414 / RFC 9728). O dispatcher em index.ts encaminha apenas
 * esses caminhos para cá; todo o resto segue para a app Hono.
 */
export function createOAuthApp(provider: SupabaseOAuthProvider, options: OAuthAppOptions): express.Express {
  const issuerUrl = new URL(options.issuerUrl);
  const app = express();

  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl,
      baseUrl: issuerUrl,
      serviceDocumentationUrl: options.serviceDocumentationUrl ? new URL(options.serviceDocumentationUrl) : undefined,
      scopesSupported: ['mcp'],
      resourceName: 'OrganizAI MCP',
      // Rate limit dos endpoints OAuth: defaults do SDK já são razoáveis e os
      // endpoints são expostos publicamente (o login do authorize é protegido
      // por credenciais do Supabase Auth).
    })
  );

  return app;
}
