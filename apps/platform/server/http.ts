export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}

export async function body(request: Request, limit: number) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new HttpError(415, 'The request must be JSON.');
  const raw = await request.text();
  if (raw.length > limit) throw new HttpError(413, 'The request is too large.');
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'The request is not valid JSON.');
  }
}

export function checkOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new HttpError(403, 'Cross-origin requests are not allowed.');
}

/** A bounded, non-empty string from request JSON. */
export function text(value: unknown, max: number, what: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new HttpError(400, `${what} must be text of at most ${max} characters.`);
  return value;
}
