import type { MiddlewareHandler } from 'hono';
import { getConnInfo } from '@hono/node-server/conninfo';
import { config } from '../config.js';

/**
 * Rate limiter em memória (fixed window) por IP.
 *
 * Apropriado para um servidor single-instance com volume doméstico/familiar.
 * Usa `X-Forwarded-For` (preenchido pelo proxy reverso) com fallback para o
 * endereço do socket, evitando que todos os clientes sem proxy compartilhem o
 * mesmo bucket.
 */
export function rateLimit(
  options: { windowMs: number; max: number } = config.rateLimit
): MiddlewareHandler {
  const { windowMs, max } = options;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Limpeza periódica para evitar crescimento infinito do mapa.
  const INTERVAL_MS = 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, INTERVAL_MS).unref?.();

  return async (c, next) => {
    const forwarded = c.req.header('x-forwarded-for');
    const peer = getConnInfo(c).remote.address;
    const ip = forwarded?.split(',')[0]?.trim() || peer || 'unknown';
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
