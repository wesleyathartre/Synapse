// Rate limiter simples em memória (janela deslizante por chave).
// Suficiente para instância única. Em produção com múltiplas instâncias,
// troque por Redis/Upstash.

interface Hit {
  count: number;
  resetAt: number;
}

const store = new Map<string, Hit>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const hit = store.get(key);

  if (!hit || hit.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  hit.count += 1;
  if (hit.count > limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - hit.count, retryAfterSec: 0 };
}

// Limpeza periódica para não vazar memória
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (v.resetAt < now) store.delete(k);
    }
  }, 60_000).unref?.();
}
