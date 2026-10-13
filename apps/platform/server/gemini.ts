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

/** One generateContent call. Provider failure is a real error, never an invented reply. */
export async function generate(env: Env, request: Generation): Promise<Part[]> {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, 'The AI service is not configured.');
  const model = env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash';
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
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([
          AbortSignal.timeout(60000),
          ...(request.signal ? [request.signal] : []),
        ]),
      },
    );
  } catch {
    throw new HttpError(504, 'The AI took too long. Try again.');
  }
  if (!response.ok)
    throw new HttpError(
      response.status === 429 ? 429 : 502,
      response.status === 429 ? 'The AI is busy. Try again shortly.' : 'The AI request failed.',
    );
  const result = (await response.json()) as { candidates?: { content?: { parts?: Part[] } }[] };
  const parts = (result.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought);
  if (!parts.length) throw new HttpError(502, 'The AI returned no answer. Try again.');
  return parts;
}
