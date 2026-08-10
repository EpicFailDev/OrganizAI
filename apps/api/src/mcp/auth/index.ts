import express from 'express';

import { config } from '../../config.js';
import { createOAuthApp } from './app.js';
import { createSupabaseOAuthProvider } from './provider.js';

/**
 * Singleton do provider OAuth do MCP.
 *
 * É compartilhado entre a app Express (createOAuthApp) e a rota Hono /mcp,
 * que usa verifyAccessToken para validar o Bearer token de cada requisição.
 */
export const oauthProvider = createSupabaseOAuthProvider({
  allowedEmails: config.oauth.allowedEmails,
});

/** Caminhos exclusivos do authorization server (dispatcher do index.ts). */
export const OAUTH_PATHS = [
  '/authorize',
  '/token',
  '/register',
  '/revoke',
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
];

/** Aplicação Express com os endpoints OAuth, usando o provider singleton. */
export function createOAuthAppSingleton(): express.Express {
  return createOAuthApp(oauthProvider, {
    issuerUrl: config.oauth.issuerUrl,
    serviceDocumentationUrl: new URL('/', config.oauth.issuerUrl).href,
  });
}

export interface McpAuth {
  userId: string;
}

/**
 * Valida o Bearer token de uma requisição /mcp.
 *
 * Retorna null quando o token está ausente/inválido/revogado — o chamador
 * responde 401 com WWW-Authenticate: Bearer.
 */
export async function verifyMcpAccessToken(token: string): Promise<McpAuth | null> {
  try {
    const info = await oauthProvider.verifyAccessToken(token);
    const userId = typeof info.extra?.userId === 'string' ? info.extra.userId : undefined;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
