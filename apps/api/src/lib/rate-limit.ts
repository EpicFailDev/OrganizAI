import type { MiddlewareHandler } from 'hono';

/**
 * Rate limiter simples em memória (fixed window) por IP.
 *
 * Apropriado para um servidor single-instance com volume doméstico/familiar.
 * Usa X-Forwarded-For (preenchido pelo nginx/proxy reverso) para obter o IP
 * real do cliente; sem proxy, usa o peer do socket.
 */
export function rateLimit(options: { windowMs: number; max: number }): MiddlewareHandler {
  const { windowMs, max } = options;
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Evita crescimento infinito do mapa: limpeza periódica simples.
  const INTERVAL_MS = 60_000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now > entry.resetAt) hits.delete(key);
    }
  }, INTERVAL_MS).unref?.();

  return async (c, next) => {
    const fwd = c.req.header('x-forwarded-for');
    const ip = fwd?.split(',')[0]?.trim() || 'unknown';
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
