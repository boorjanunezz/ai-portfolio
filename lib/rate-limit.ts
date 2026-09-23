import "server-only";

/**
 * Rate limit en memoria por IP (ventana deslizante).
 * Es "best effort": en Vercel cada instancia serverless tiene su propia memoria,
 * así que no es un límite global, pero frena abusos básicos sin añadir infraestructura.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // evita crecimiento sin límite
  return recent.length > MAX_REQUESTS;
}
