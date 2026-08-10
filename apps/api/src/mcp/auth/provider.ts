import express from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import {
  InvalidGrantError,
  InvalidTokenError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';

import { supabase } from '../../lib/supabase.js';
import { OAuthState, type StoredSession } from './store.js';

/**
 * Implementa o servidor OAuth do MCP (RFC 7591 + PKCE S256) sobre o Supabase
 * Auth do OrganizAI.
 *
 * Estratégia de tokens:
 * - access_token emitido = JWT de sessão do Supabase (válido ~1h), de modo que
 *   o PostgREST aplique as RLS do usuário via `createUserClient(accessToken)`.
 * - refresh_token emitido = refresh_token do Supabase; a renovação (grant
 *   `refresh_token`) chama `supabase.auth.refreshSession`.
 * - O login do usuário acontece na página `/authorize`, validando e-mail e
 *   senha contra o Supabase Auth (`signInWithPassword`).
 */

export interface SupabaseOAuthProviderOptions {
  /** E-mails permitidos no authorize. Vazio = qualquer usuário válido do Supabase. */
  allowedEmails?: string[];
}

/** Cria o provider OAuth com as opções dadas. */
export function createSupabaseOAuthProvider(options: SupabaseOAuthProviderOptions = {}): SupabaseOAuthProvider {
  return new SupabaseOAuthProvider(options);
}

export class SupabaseOAuthProvider implements OAuthServerProvider {
  readonly state = new OAuthState();

  readonly clientsStore: OAuthRegisteredClientsStore = {
    getClient: async (clientId) => this.state.clients.get(clientId),

    registerClient: async (client) => {
      // O tipo do SDK omite client_id/client_id_issued_at, mas em runtime o
      // handler de registro já os preencheu. Sobrescrever com IDs gerados aqui
      // é seguro: o handler usa o retorno como fonte da resposta.
      const clientId = randomUUID();
      const record: OAuthClientInformationFull = {
        ...client,
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
      };
      this.state.clients.set(clientId, record);
      return record;
    },
  };

  constructor(private options: SupabaseOAuthProviderOptions = {}) {}

  /**
   * Rende a página de login (GET) ou processa as credenciais (POST).
   * Em caso de sucesso, emite um código de autorização e redireciona para o
   * redirect_uri com `code` e `state` (per RFC 6749 §4.1.2).
   */
  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: express.Response): Promise<void> {
    this.state.cleanupExpired();
    const req = res.req;
    const { codeChallenge, redirectUri, scopes = [], state, resource } = params;
    const clientId = client.client_id;
    const scope = scopes.join(' ');
    const resourceHref = resource?.href;

    if (req.method === 'POST') {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const renderError = (message: string) =>
        renderLogin(res, { clientId, redirectUri, codeChallenge, scope, state, resource: resourceHref, error: message });

      if (!email || !password) {
        return renderError('Informe e-mail e senha.');
      }

      const allowed = this.options.allowedEmails ?? [];
      if (allowed.length > 0 && !allowed.includes(email)) {
        return renderError('Este e-mail não está autorizado a acessar o MCP.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      const session = data?.session;
      if (error || !session) {
        return renderError('Credenciais inválidas.');
      }

      const code = randomBytes(24).toString('base64url');
      this.state.authorizations.set(code, {
        clientId,
        codeChallenge,
        redirectUri,
        state,
        scopes,
        session: {
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          userId: session.user.id,
        },
        issuedAt: Date.now(),
      });

      const redirect = new URL(redirectUri);
      redirect.searchParams.set('code', code);
      if (state) redirect.searchParams.set('state', state);
      res.redirect(302, redirect.href);
      return;
    }

    return renderLogin(res, { clientId, redirectUri, codeChallenge, scope, state, resource: resourceHref });
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, code: string): Promise<string> {
    const pending = this.state.authorizations.get(code);
    if (!pending) {
      throw new InvalidGrantError('Código de autorização inválido ou expirado');
    }
    if (pending.clientId !== client.client_id) {
      throw new InvalidGrantError('Código de autorização não pertence a este cliente');
    }
    return pending.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    this.state.cleanupExpired();
    const pending = this.state.authorizations.get(code);
    if (!pending) {
      throw new InvalidGrantError('Código de autorização inválido ou já utilizado');
    }
    if (pending.clientId !== client.client_id) {
      throw new InvalidGrantError('Código de autorização não pertence a este cliente');
    }
    // Uso único: remove antes de retornar.
    this.state.authorizations.delete(code);
    return this.issueTokens(pending.clientId, pending.scopes, pending.session);
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    const entry = this.state.refreshTokens.get(refreshToken);
    if (!entry) {
      throw new InvalidGrantError('Refresh token inválido ou revogado');
    }
    if (entry.clientId !== client.client_id) {
      throw new InvalidGrantError('Refresh token não pertence a este cliente');
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      this.state.refreshTokens.delete(refreshToken);
      throw new InvalidGrantError('Falha ao renovar a sessão: reautentique-se');
    }

    // Rotaciona o refresh token antigo.
    this.state.refreshTokens.delete(refreshToken);
    return this.issueTokens(entry.clientId, scopes ?? entry.scopes, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      userId: data.session.user.id,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (this.state.revokedTokens.has(token)) {
      throw new InvalidTokenError('Token revogado');
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      throw new InvalidTokenError('Token inválido ou expirado');
    }
    const issued = this.state.issuedAccessTokens.get(token);
    return {
      token,
      clientId: issued?.clientId ?? 'manual',
      scopes: issued?.scopes ?? [],
      expiresAt: issued?.expiresAt,
      extra: { userId: data.user.id },
    };
  }

  async revokeToken(_client: OAuthClientInformationFull, request: { token: string }): Promise<void> {
    this.state.revokedTokens.add(request.token);
    this.state.issuedAccessTokens.delete(request.token);
    this.state.refreshTokens.delete(request.token);

    // Revoga também a sessão Supabase subjacente (best-effort). Requer service
    // role key; sem ela, a blacklist em memória já impede o uso pelo MCP.
    try {
      await supabase.auth.admin.signOut(request.token);
    } catch {
      // ignore: sem service role key ou token já inválido
    }
  }

  /** Emite (e registra) access + refresh tokens a partir de uma sessão. */
  private issueTokens(clientId: string, scopes: string[], session: StoredSession): OAuthTokens {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = Math.max(0, session.expiresAt - now);

    this.state.issuedAccessTokens.set(session.accessToken, {
      clientId,
      scopes,
      userId: session.userId,
      expiresAt: session.expiresAt,
    });
    this.state.refreshTokens.set(session.refreshToken, { ...session, clientId, scopes });

    return {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: scopes.length > 0 ? scopes.join(' ') : undefined,
    };
  }
}

interface LoginFormData {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  state?: string;
  resource?: string;
  error?: string;
}

/** Escapa valores para uso seguro dentro de atributos HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderLogin(res: express.Response, data: LoginFormData): void {
  const { clientId, redirectUri, codeChallenge, scope, state, resource, error } = data;
  const errorHtml = error ? `<p class="error">${esc(error)}</p>` : '';

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OrganizAI — Autorização MCP</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; width: 100%; max-width: 360px; }
    h1 { font-size: 1.25rem; color: #a855f7; margin-top: 0; }
    label { display: block; margin: 0.75rem 0 0.25rem; font-size: 0.875rem; color: #cbd5e1; }
    input { width: 100%; padding: 0.6rem; border-radius: 0.5rem; border: 1px solid #475569; background: #0f172a; color: #f8fafc; }
    button { width: 100%; margin-top: 1.25rem; padding: 0.7rem; background: #9333ea; color: white; border: 0; border-radius: 0.5rem; font-weight: bold; cursor: pointer; }
    button:hover { background: #7e22ce; }
    .error { color: #f87171; font-size: 0.875rem; }
    .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 1rem; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>OrganizAI — Autorizar MCP</h1>
    <p style="font-size: 0.875rem; color: #cbd5e1;">Entre para autorizar o agente a acessar seus dados financeiros.</p>
    ${errorHtml}
    <form method="POST" action="/authorize">
      <input type="hidden" name="client_id" value="${esc(clientId)}">
      <input type="hidden" name="redirect_uri" value="${esc(redirectUri)}">
      <input type="hidden" name="response_type" value="code">
      <input type="hidden" name="code_challenge" value="${esc(codeChallenge)}">
      <input type="hidden" name="code_challenge_method" value="S256">
      ${scope ? `<input type="hidden" name="scope" value="${esc(scope)}">` : ''}
      ${state ? `<input type="hidden" name="state" value="${esc(state)}">` : ''}
      ${resource ? `<input type="hidden" name="resource" value="${esc(resource)}">` : ''}
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required autocomplete="username" autofocus>
      <label for="password">Senha</label>
      <input id="password" name="password" type="password" required autocomplete="current-password">
      <button type="submit">Autorizar acesso</button>
    </form>
    <p class="hint">Sua senha é validada pelo Supabase Auth. Nenhum dado é armazenado.</p>
  </div>
</body>
</html>`);
}
