import { useSyncExternalStore } from 'react';
import { innerRooms, runTool, type Character, type RoomData } from '@experience/room-spec';
import { newRecordId } from '@experience/room-runtime';
import type { OpenRoom } from '../../app/rooms';
import { post } from '../../shared/api';

type Part = { text?: string; functionCall?: { id?: string; name: string; args?: object } };
type Turn =
  | { role: 'user'; text: string }
  | { role: 'agent'; parts: Part[] }
  | { role: 'tool'; results: { id?: string; name: string; response: object }[] };
export type Line = { id: number; kind: 'person' | 'agent' | 'activity' | 'error'; text: string };
type State = { lines: Line[]; busy: boolean };

/** What conversations need from the app: every open room, and how to point and move. */
export type ConversationHost = {
  rooms: Map<string, OpenRoom>;
  focus: (roomKey: string, panelId: string) => void;
  open: (roomKey: string) => void;
};

const MAX_STEPS = 6;
const MAX_TURNS = 40;
let lineId = 0;
let host: ConversationHost | undefined;
/** A note for the room the person was just taken into; `voice` when a call should carry on. */
let pending: { key: string; message: string; shown: string; voice: boolean } | null = null;
const conversations = new Map<string, Conversation>();

export const setConversationHost = (value: ConversationHost) => (host = value);

/** The handoff waiting for a room, taken once so a remount cannot send it twice. */
export function takeHandoff(roomKey: string) {
  if (pending?.key !== roomKey) return null;
  const handoff = pending;
  pending = null;
  return handoff;
}

/** Keeps the latest turns, always starting at something the person said. */
function bounded(turns: Turn[]) {
  let start = Math.max(0, turns.length - MAX_TURNS);
  while (start < turns.length && turns[start].role !== 'user') start++;
  return turns.slice(start);
}

/**
 * One character's conversation, living outside any page so it survives moving between rooms.
 * Each message runs the tool loop: the character answers or calls tools, the calls run here
 * through the room rules, and the results go back until it answers in words. A failed
 * exchange is not kept as history.
 */
export class Conversation {
  private state: State;
  private listeners = new Set<() => void>();
  private turns: Turn[] = [];
  private controller: AbortController | null = null;

  constructor(
    private room: OpenRoom,
    private character: Character,
  ) {
    this.state = {
      lines: [{ id: lineId++, kind: 'agent', text: character.greeting }],
      busy: false,
    };
  }

  get = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private update(next: Partial<State>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  private add(kind: Line['kind'], text: string) {
    this.update({ lines: [...this.state.lines, { id: lineId++, kind, text }] });
  }

  /** What the character may read below its room: each inner room's data by relative path. */
  private below() {
    const below: Record<string, RoomData> = {};
    for (const inner of innerRooms(this.room.spec)) {
      const data = host?.rooms.get(`${this.room.key}/${inner.path}`)?.store.get();
      if (data) below[inner.path] = data;
    }
    return below;
  }

  /**
   * Runs one tool call through the room rules and applies it: data to the store, world
   * actions to the surface, focus and activity to the page. Text turns and voice share it.
   */
  apply(name: string, args: Record<string, unknown>) {
    const { room, character } = this;
    const outcome = runTool(room.spec, character, room.store.get(), { name, args }, newRecordId);
    room.store.set(outcome.data);
    if (outcome.focus) host?.focus(room.key, outcome.focus);
    if (outcome.act) room.surface?.act(outcome.act.character, outcome.act.action, outcome.act.args);
    if (outcome.activity) this.add('activity', outcome.activity);
    if ('error' in outcome.response) this.add('activity', `⚠ ${String(outcome.response.error)}`);
    return { response: outcome.response, open: outcome.open, silent: Boolean(outcome.silent) };
  }

  /**
   * Takes the person into an inner room. A world may stage the way there: a scene named
   * `to-<inner room id>` plays first (the character flies off, the camera follows).
   */
  async handOff(handoff: { path: string; note: string }, voice = false) {
    const { room, character } = this;
    const key = `${room.key}/${handoff.path}`;
    pending = {
      key,
      message: `HANDOFF from ${character.name} (${character.role}) in "${room.spec.title}": ${handoff.note}`,
      shown: `↪ ${character.name}: ${handoff.note}`,
      voice,
    };
    const departure = `to-${handoff.path.split('/')[0]}`;
    if (room.spec.world?.scenes?.some((s) => s.id === departure))
      await room.surface?.play?.(departure).catch(() => undefined);
    host?.open(key);
  }

  /** A spoken line from a voice call: grows while it is said, joins the history when done. */
  private live: Partial<Record<'person' | 'agent', number>> = {};
  hear(role: 'person' | 'agent', text: string, final: boolean) {
    const id = this.live[role];
    const lines = this.state.lines;
    if (id !== undefined && lines.some((l) => l.id === id))
      this.update({ lines: lines.map((l) => (l.id === id ? { ...l, text } : l)) });
    else {
      this.add(role, text);
      this.live[role] = this.state.lines.at(-1)!.id;
    }
    if (!final) return;
    delete this.live[role];
    this.turns = bounded([
      ...this.turns,
      role === 'person' ? { role: 'user', text } : { role: 'agent', parts: [{ text }] },
    ]);
  }

  /** What a voice ticket needs to know about this conversation's room. */
  context() {
    const { room, character } = this;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      // The person's own day and time, for habits that belong to their day.
      now: {
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        weekday: now.toLocaleDateString('en-US', { weekday: 'long' }),
      },
      room: room.spec,
      characterId: character.id,
      data: room.store.get(),
      below: this.below(),
      world: room.surface?.state(),
    };
  }

  async send(message: string, shown?: { kind: Line['kind']; text: string }) {
    const text = message.trim();
    if (!text || this.controller) return;
    const abort = new AbortController();
    this.controller = abort;
    this.update({ busy: true });
    this.room.surface?.setMode(this.character.id, 'thinking');
    this.add(shown?.kind ?? 'person', shown?.text ?? text);
    const { room, character } = this;
    const history: Turn[] = bounded([...this.turns, { role: 'user', text }]);
    let handoff: { path: string; note: string } | undefined;
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const { parts } = await post<{ parts: Part[] }>(
          '/api/agent',
          { ...this.context(), turns: history },
          abort.signal,
        );
        history.push({ role: 'agent', parts });
        const said = parts
          .map((p) => p.text ?? '')
          .join('')
          .trim();
        if (said) {
          this.add('agent', said);
          this.talk(said.length);
        }
        const calls = parts.flatMap((p) => (p.functionCall ? [p.functionCall] : []));
        if (!calls.length) break;
        const results = calls.map((call) => {
          const { response, open } = this.apply(call.name, { ...call.args } as Record<
            string,
            unknown
          >);
          if (open) handoff = open;
          return { ...(call.id ? { id: call.id } : {}), name: call.name, response };
        });
        history.push({ role: 'tool', results });
        if (step === MAX_STEPS - 1) this.add('error', 'Stopped after several actions in a row.');
      }
      if (history.at(-1)?.role !== 'tool') this.turns = history;
      if (handoff) void this.handOff(handoff);
    } catch (error) {
      if (!abort.signal.aborted)
        this.add('error', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      this.controller = null;
      this.update({ busy: false });
      if (this.room.surface?.speaking !== this.character.id)
        this.room.surface?.setMode(this.character.id, 'idle');
    }
  }

  /**
   * On a stage, the character talks while its words appear: a text talk loop, not lip sync
   * (lip sync comes with audio). Others turn to it until it is done.
   */
  private talkTimer = 0;
  private talk(characters: number) {
    const stage = this.room.surface;
    if (!stage) return;
    stage.speak(this.character.id);
    clearTimeout(this.talkTimer);
    const seconds = Math.min(8, Math.max(1.5, characters * 0.055));
    this.talkTimer = window.setTimeout(() => {
      if (stage.speaking === this.character.id) stage.speak(null);
    }, seconds * 1000);
  }

  stop() {
    this.controller?.abort();
  }
}

export function conversationFor(room: OpenRoom, character: Character) {
  const key = `${room.key}:${character.id}`;
  let conversation = conversations.get(key);
  if (!conversation) conversations.set(key, (conversation = new Conversation(room, character)));
  return conversation;
}

export function useConversation(conversation: Conversation) {
  return useSyncExternalStore(conversation.subscribe, conversation.get, conversation.get);
}
