import { agentTurn } from './agent';
import { liveTicket } from './live';
import type { Env } from './env';
import { body, checkOrigin, HttpError, json } from './http';
import { limit } from './limits';

/**
 * Open for testing while there are no accounts: anyone with the link shares the key's quota.
 * OPEN_AI_PREVIEW=false closes it; close it before the key has billing.
 */
const aiOpen = (env: Env) => env.OPEN_AI_PREVIEW !== 'false';

/** Where the browser signs in for rooms from LifeOS: an https project URL and its public key. */
function lifeos(env: Env) {
  const url = env.LIFEOS_SUPABASE_URL ?? '';
  const key = env.LIFEOS_SUPABASE_PUBLISHABLE_KEY ?? '';
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && key ? { url, key } : null;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  try {
    checkOrigin(request);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/status')
      return json({ ai: aiOpen(env) && Boolean(env.GEMINI_API_KEY), lifeos: lifeos(env) });
    const action = path === '/api/agent' ? 'agent' : path === '/api/live' ? 'live' : null;
    if (!action) throw new HttpError(404, 'Not found.');
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    if (!aiOpen(env)) throw new HttpError(503, 'AI rooms are not open on this deployment yet.');
    limit(request, action);
    const input = await body(request, 512_000);
    if (action === 'live') return json(await liveTicket(env, input, request.signal));
    return json(await agentTurn(env, input, request.signal));
  } catch (error) {
    if (!(error instanceof HttpError)) console.error(error);
    return json(
      { error: error instanceof HttpError ? error.message : 'Something went wrong. Try again.' },
      error instanceof HttpError ? error.status : 500,
    );
  }
}
