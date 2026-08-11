import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { config } from '../config.js';

/**
 * Rate limiter em memória (fixed window) por IP.
 *
 * Apropriado para um servidor single-instance com volume doméstico/familiar.
 * Usa `X-Forwarded-For` apenas quando `config.rateLimit.trustProxy` está
 * habilitado (o proxy reverso sobrescreve o header a cada requisição); caso
 * contrário, usa o endereço do socket — assim um cliente não consegue rotacionar
 * o header para burlar o bucket.
 */

// Limpeza periódica em singleton (não por chamada de rateLimit), evitando
// vazamento de timers a cada createApp().
const hits = new Map<string, { count: number; resetAt: number }>();
const INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits.entries()) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, INTERVAL_MS).unref?.();

/** Limpa os buckets de rate limit (usado nos testes para isolamento). */
export function resetRateLimit(): void {
  hits.clear();
}

export function rateLimit(
  options: { windowMs: number; max: number; trustProxy?: boolean } = config.rateLimit
): MiddlewareHandler {
  const { windowMs, max, trustProxy } = options;

  return async (c, next) => {
    const forwarded = trustProxy ? c.req.header('x-forwarded-for') : undefined;

    // getConnInfo depende do servidor node-server (env.incoming). Em ambientes
    // sem essa informação (ex.: testes com app.request) caímos para 'unknown'
    // em vez de lançar.
    let peer: string | undefined;
    try {
      peer = getConnInfo(c).remote.address;
    } catch {
      peer = undefined;
    }

    // Pega o ÚLTIMO IP da cadeia X-Forwarded-For: o proxy reverso sobrescreve
    // o header com $remote_addr (o cliente não controla o valor), e o último
    // elemento é sempre o endereço do proxy mais próximo, imune a spoofing.
    const ip = forwarded?.split(',')[forwarded.split(',').length - 1]?.trim() || peer || 'unknown';
    const now = Date.now();

    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return c.json(
        { error: 'Muitas requisições. Tente novamente em instantes.' },
        429,
        { 'Retry-After': String(retryAfter) }
      );
    }

    await next();
  };
}
