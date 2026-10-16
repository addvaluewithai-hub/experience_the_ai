import { useSyncExternalStore } from 'react';
import type { Character } from '@experience/room-spec';
import { VoiceSession, type LiveTicket, type VoiceStatus } from '@experience/live-runtime';
import type { OpenRoom } from '../../app/rooms';
import { post } from '../../shared/api';
import { arrivalCue, conversationFor } from './conversation';

export type Call = {
  status: VoiceStatus | 'idle';
  roomKey?: string;
  character?: string;
  muted: boolean;
  message?: string;
};

let state: Call = { status: 'idle', muted: false };
let session: VoiceSession | null = null;
const listeners = new Set<() => void>();
const set = (next: Partial<Call>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

/**
 * One voice call at a time, with one character. Starting another ends the first. What is said
 * lands in that character's conversation; tool calls run through the room like typed ones.
 */
export async function startCall(
  room: OpenRoom,
  character: Character,
  /** `true`: the character greets the person who just arrived; text: speaks first from it. */
  options: { greet?: boolean | string } = {},
) {
  await endCall();
  const conversation = conversationFor(room, character);
  set({
    status: 'connecting',
    roomKey: room.key,
    character: character.id,
    muted: false,
    message: undefined,
  });
  const current = new VoiceSession({
    character: character.id,
    presence: room.surface,
    // In an immersive room the call is how the person arrives, so the character speaks first.
    greet:
      typeof options.greet === 'string'
        ? options.greet
        : options.greet
          ? arrivalCue(room, character)
          : undefined,
    ticket: () => post<LiveTicket>('/api/live', conversation.context()),
    runTool: async (call) => {
      const { response, open, silent } = await conversation.apply(call.name, call.args);
      // The call carries on into the inner room: its first character picks up the note.
      if (open) void conversation.handOff(open, true);
      return { response, silent };
    },
    transcript: (role, text, final) =>
      conversation.hear(role === 'person' ? 'person' : 'agent', text, final),
    status: (status, message) => {
      if (session === current) set({ status, message });
    },
  });
  session = current;
  await current.start();
}

export async function endCall() {
  const current = session;
  session = null;
  if (current) await current.stop();
  set({ status: 'idle', roomKey: undefined, character: undefined, message: undefined });
}

/** Typed words during a call: shown as the person's line and answered by voice. */
export function sayInCall(room: OpenRoom, character: Character, text: string) {
  if (!session || state.roomKey !== room.key || state.character !== character.id) return false;
  conversationFor(room, character).hear('person', text, true);
  session.say(text);
  return true;
}

export function toggleMute() {
  session?.mute(!state.muted);
  set({ muted: !state.muted });
}

export function useCall() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}
