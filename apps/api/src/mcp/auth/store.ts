import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * Estado em memória do servidor OAuth do MCP.
 *
 * Como o backend é single-instance (VPS doméstico), um Map em memória é
 * suficiente. Em um cenário com múltiplas réplicas seria necessário um store
 * compartilhado (Redis/Postgres) — fora do escopo atual.
 *
 * Toda a sessão Supabase do usuário (access_token, refresh_token) fica aqui
 * apenas enquanto o cliente MCP estiver ativo; a revogação remove as entradas.
 */

/** Sessão Supabase capturada no login do usuário durante o authorize. */
export interface StoredSession {
  /** access_token do Supabase (JWT) — também é o access_token OAuth emitido. */
  accessToken: string;
  /** refresh_token do Supabase — usado para renovar o JWT (1h de validade). */
  refreshToken: string;
  /** Expiração do access token, em segundos desde a época. */
  expiresAt: number;
  /** ID do usuário autenticado no Supabase Auth. */
  userId: string;
}

/** Autorização pendente: guarda o code_challenge e a sessão até a troca. */
export interface PendingAuthorization {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  state?: string;
  scopes: string[];
  session: StoredSession;
  issuedAt: number;
}

/** Metadados de um access token emitido (para resolver o clientId no verify). */
export interface IssuedTokenInfo {
  clientId: string;
  scopes: string[];
  userId: string;
  expiresAt?: number;
}

const AUTHORIZATION_TTL_MS = 10 * 60 * 1000; // códigos expiram em 10 minutos

export class OAuthState {
  /** Clientes registrados (dynamic client registration, RFC 7591). */
  readonly clients = new Map<string, OAuthClientInformationFull>();
  /** Códigos de autorização de uso único → autorização pendente. */
  readonly authorizations = new Map<string, PendingAuthorization>();
  /** refresh_token (do Supabase) → sessão + clientId + escopos concedidos. */
  readonly refreshTokens = new Map<string, StoredSession & { clientId: string; scopes: string[] }>();
  /** access_token (JWT Supabase) → metadados do token emitido. */
  readonly issuedAccessTokens = new Map<string, IssuedTokenInfo>();
  /** Tokens revogados (blacklist). */
  readonly revokedTokens = new Set<string>();

  /** Remove códigos de autorização vencidos para evitar crescimento do Map. */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [code, pending] of this.authorizations.entries()) {
      if (now - pending.issuedAt > AUTHORIZATION_TTL_MS) {
        this.authorizations.delete(code);
      }
    }
  }
}
