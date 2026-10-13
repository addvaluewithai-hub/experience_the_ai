import type { Env } from './env';
import { HttpError } from './http';

export type Part = {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: { id?: string; name: string; args?: Record<string, unknown> };
  functionResponse?: { id?: string; name: string; response: Record<string, unknown> };
};
export type Content = { role: 'user' | 'model'; parts: Part[] };
export type Generation = {
  instruction: string;
  contents: Content[];
  tools?: { name: string; description: string; parameters: unknown }[];
  signal?: AbortSignal;
};

/** One POST to the Gemini API. Provider failure is a real error, never an invented reply. */
export async function gemini(env: Env, path: string, payload: unknown, signal?: AbortSignal) {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'The AI service is not configured.');
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([AbortSignal.timeout(60000), ...(signal ? [signal] : [])]),
    });
  } catch {
    throw new HttpError(504, 'The AI took too long. Try again.');
  }
  if (!response.ok)
    throw new HttpError(
      response.status === 429 ? 429 : 502,
      response.status === 429 ? 'The AI is busy. Try again shortly.' : 'The AI request failed.',
    );
  return (await response.json()) as unknown;
}

/** One generateContent turn with the character's tools. */
export async function generate(env: Env, request: Generation): Promise<Part[]> {
  const model = env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash-lite';
  const payload = {
    systemInstruction: { parts: [{ text: request.instruction }] },
    contents: request.contents,
    generationConfig: { maxOutputTokens: 4000 },
    ...(request.tools?.length
      ? {
          tools: [
            {
              functionDeclarations: request.tools.map((t) => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: t.parameters,
              })),
            },
          ],
        }
      : {}),
  };
  const result = (await gemini(
    env,
    `models/${model}:generateContent`,
    payload,
    request.signal,
  )) as {
    candidates?: { content?: { parts?: Part[] } }[];
  };
  const parts = (result.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought);
  if (!parts.length) throw new HttpError(502, 'The AI returned no answer. Try again.');
  return parts;
}
