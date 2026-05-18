const buckets = new Map<string, number[]>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const since = now - opts.windowMs;
  const hits = (buckets.get(key) ?? []).filter(t => t > since);

  if (hits.length >= opts.limit) {
    const retryMs = Math.max(0, opts.windowMs - (now - hits[0]));
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(retryMs / 1000)}s.`);
  }

  hits.push(now);
  buckets.set(key, hits);
}
