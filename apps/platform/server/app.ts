import { agentTurn } from './agent';
import { liveTicket } from './live';
import type { Env } from './env';
import { body, checkOrigin, HttpError, json } from './http';
import { limit } from './limits';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  try {
    checkOrigin(request);
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/api/status')
      return json({ ai: env.OPEN_AI_PREVIEW === 'true' && Boolean(env.GEMINI_API_KEY) });
    const action = path === '/api/agent' ? 'agent' : path === '/api/live' ? 'live' : null;
    if (!action) throw new HttpError(404, 'Not found.');
    if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
    // There are no accounts yet, so AI routes stay closed unless a preview opts in.
    if (env.OPEN_AI_PREVIEW !== 'true')
      throw new HttpError(503, 'AI rooms are not open on this deployment yet.');
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
