import { parsePersonCall, type Character, type ServiceCall } from '@experience/room-spec';
import { askPerson, readable } from '../features/room/confirm';
import { lifeosAction } from '../lifeos/connection';
import type { OpenRoom } from './rooms';

type Handler = (action: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

/** The sources this app can act on, by the name rooms use for them. */
const sources: Record<string, Handler> = { 'lifeos.goals': lifeosAction };

async function perform(source: string, action: string, args: Record<string, unknown>) {
  const handler = sources[source];
  if (!handler) return { error: `${source} is not connected here.` };
  try {
    return await handler(action, args);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'The action failed.' };
  }
}

/**
 * A character's accepted service call: the person confirms first when the room asks for it,
 * then the source performs it with the person's own authorization. A refusal is an answer.
 */
export async function performCall(room: OpenRoom, character: Character, call: ServiceCall) {
  if (call.confirm) {
    const yes = await askPerson({
      who: character.name,
      label: call.label,
      details: readable(call, room.store.get()),
    });
    if (!yes)
      return {
        declined: true,
        message: 'The person said not now. Do not ask again unless they do.',
      };
  }
  return perform(call.source, call.action, call.args);
}

/** The person's own action from a room's surface: their tap is the confirmation. */
export function personRun(room: OpenRoom, action: string, args: Record<string, unknown>) {
  const parsed = parsePersonCall(room.spec, action, args);
  if ('error' in parsed) return Promise.resolve({ error: parsed.error });
  return perform(parsed.source, parsed.action, parsed.args);
}
