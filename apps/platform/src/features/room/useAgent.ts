import { useCallback, useEffect, useRef, useState } from 'react';
import { runTool, type Character } from '@experience/room-spec';
import { newRecordId } from '@experience/room-runtime';
import type { OpenRoom } from '../../app/App';
import { post } from '../../shared/api';

type Part = { text?: string; functionCall?: { id?: string; name: string; args?: object } };
type Turn =
  | { role: 'user'; text: string }
  | { role: 'agent'; parts: Part[] }
  | { role: 'tool'; results: { id?: string; name: string; response: object }[] };
export type Line = { id: number; kind: 'person' | 'agent' | 'activity' | 'error'; text: string };

const MAX_STEPS = 6;
const MAX_TURNS = 40;
let lineId = 0;

/** Keeps the latest turns, always starting at something the person said. */
function bounded(turns: Turn[]) {
  let start = Math.max(0, turns.length - MAX_TURNS);
  while (start < turns.length && turns[start].role !== 'user') start++;
  return turns.slice(start);
}

/**
 * One conversation per character. Each message runs the tool loop: the character answers or
 * calls tools, the calls run here against the room through the room rules, and the results go
 * back until the character answers in words. A failed exchange is not kept as history.
 */
export function useAgent(room: OpenRoom, character: Character, setFocus: (id: string) => void) {
  const [lines, setLines] = useState<Line[]>(() => [
    { id: lineId++, kind: 'agent', text: character.greeting },
  ]);
  const [busy, setBusy] = useState(false);
  const turns = useRef<Turn[]>([]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const add = (kind: Line['kind'], text: string) =>
    setLines((current) => [...current, { id: lineId++, kind, text }]);

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || controller.current) return;
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      add('person', text);
      const history: Turn[] = bounded([...turns.current, { role: 'user', text }]);
      try {
        for (let step = 0; step < MAX_STEPS; step++) {
          const { parts } = await post<{ parts: Part[] }>(
            '/api/agent',
            {
              room: room.spec,
              characterId: character.id,
              data: room.store.get(),
              turns: history,
            },
            abort.signal,
          );
          history.push({ role: 'agent', parts });
          const said = parts
            .map((p) => p.text ?? '')
            .join('')
            .trim();
          if (said) add('agent', said);
          const calls = parts.flatMap((p) => (p.functionCall ? [p.functionCall] : []));
          if (!calls.length) break;
          const results = calls.map((call) => {
            const outcome = runTool(
              room.spec,
              character,
              room.store.get(),
              { name: call.name, args: { ...call.args } },
              newRecordId,
            );
            room.store.set(outcome.data);
            if (outcome.focus) setFocus(outcome.focus);
            if (outcome.activity) add('activity', outcome.activity);
            if ('error' in outcome.response)
              add('activity', `⚠ ${String(outcome.response.error)}`);
            return {
              ...(call.id ? { id: call.id } : {}),
              name: call.name,
              response: outcome.response,
            };
          });
          history.push({ role: 'tool', results });
          if (step === MAX_STEPS - 1) add('error', 'Stopped after several actions in a row.');
        }
        turns.current = history.at(-1)?.role === 'tool' ? turns.current : history;
      } catch (error) {
        if (!abort.signal.aborted)
          add('error', error instanceof Error ? error.message : 'Something went wrong.');
      } finally {
        controller.current = null;
        setBusy(false);
      }
    },
    [room, character, setFocus],
  );

  const stop = useCallback(() => controller.current?.abort(), []);
  return { lines, busy, send, stop };
}
