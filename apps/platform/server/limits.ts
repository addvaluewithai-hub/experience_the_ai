import { HttpError } from './http';

// Best-effort per-isolate guard; a distributed quota per account comes with accounts.
// 15 per minute matches the free Gemini 3.5 Flash Lite limit; one message can take several.
const requests = new Map<string, { until: number; count: number }>();
const MAX: Record<string, number> = { agent: 15 };

export function limit(request: Request, action: string, now = Date.now()) {
  for (const [key, value] of requests) if (value.until <= now) requests.delete(key);
  const caller = request.headers.get('cf-connecting-ip') ?? 'local';
  const key = `${caller}:${action}`;
  const entry = requests.get(key) ?? { until: now + 60000, count: 0 };
  if (entry.count >= (MAX[action] ?? 10) || requests.size >= 10000)
    throw new HttpError(429, 'Too many requests. Wait a moment and try again.');
  entry.count++;
  requests.set(key, entry);
}
