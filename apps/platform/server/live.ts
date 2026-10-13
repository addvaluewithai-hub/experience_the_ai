import type { RoomSpec, ToolDeclaration } from '@experience/room-spec';
import { characterContext } from './agent';
import type { Env } from './env';
import { gemini } from './gemini';
import { HttpError } from './http';

const SPOKEN = `This is a live voice call: you are heard, not read. Speak naturally and briefly (one to three spoken sentences), let the person interrupt you, and never read lists, ids, JSON or tool names aloud. World tools are silent and non-blocking: call them while you talk, at the moment the action belongs to, and keep talking from the next unsaid word.`;

/** JSON Schema (lowercase types) to the Live API's OpenAPI subset (uppercase types). */
function schema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(schema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      k === 'type' && typeof v === 'string' ? v.toUpperCase() : schema(v),
    ]),
  );
}

export function liveTools(spec: RoomSpec, tools: ToolDeclaration[]) {
  const silent = new Set(spec.world?.actions.filter((a) => a.silent).map((a) => a.name));
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: schema(tool.parameters),
    ...(silent.has(tool.name) ? { behavior: 'NON_BLOCKING' } : {}),
  }));
}

/**
 * A single-use, short-lived token for one character's voice call. The whole setup (model,
 * voice, instruction, tools) is locked server-side, so the browser cannot change who the
 * character is or what it may do (new-learn's Nova pattern).
 */
export async function liveTicket(env: Env, input: Record<string, unknown>, signal?: AbortSignal) {
  const { spec, character, instruction, tools } = characterContext(input);
  const model = env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';
  const config = {
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: character.voice ?? 'Kore' } },
      },
    },
    systemInstruction: { parts: [{ text: `${instruction}\n${SPOKEN}` }] },
    tools: [{ functionDeclarations: liveTools(spec, tools) }],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };
  const token = (await gemini(
    env,
    'auth_tokens',
    {
      uses: 1,
      expireTime: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
      bidiGenerateContentSetup: { model: `models/${model}`, ...config },
    },
    signal,
  )) as { name?: unknown };
  if (typeof token.name !== 'string') throw new HttpError(502, 'Could not prepare the voice call.');
  return { token: token.name, model, config };
}
