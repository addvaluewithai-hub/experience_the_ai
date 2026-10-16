import { useSyncExternalStore } from 'react';
import type { RoomData, ServiceCall } from '@experience/room-spec';

/** One question to the person: a character wants to change their records outside the room. */
export type Ask = { id: number; who: string; label: string; details: string[] };

let asking: (Ask & { answer: (yes: boolean) => void }) | null = null;
let askId = 0;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

/**
 * The call's arguments as the person reads them: an argument naming a record of the room
 * (a goal id, say) shows that record's first words instead of its id.
 */
export function readable(call: ServiceCall, data: RoomData): string[] {
  const records = Object.values(data).flat();
  return Object.entries(call.args).map(([key, value]) => {
    const record = records.find((r) => r.id === value);
    const words = record && Object.values(record.values).find((v) => typeof v === 'string');
    const shown = words ?? (typeof value === 'boolean' ? (value ? 'yes' : 'no') : String(value));
    return `${key.replaceAll('_', ' ')}: ${shown}`;
  });
}

/**
 * Asks the person and waits for their tap. A newer question replaces an unanswered one, which
 * counts as declined, so a character can never stack confirmations behind the person's back.
 */
export function askPerson(question: Omit<Ask, 'id'>): Promise<boolean> {
  asking?.answer(false);
  return new Promise((resolve) => {
    const id = ++askId;
    asking = {
      ...question,
      id,
      answer: (yes) => {
        if (asking?.id === id) asking = null;
        resolve(yes);
        changed();
      },
    };
    changed();
  });
}

/** The question waiting for the person, if any (for the card, and for tests). */
export const currentAsk = () => asking;

export function useAsk() {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, currentAsk);
}
