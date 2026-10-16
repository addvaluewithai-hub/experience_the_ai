import { useSyncExternalStore } from 'react';
import type { SourceRecords } from '../app/rooms';
import { goalAction } from './actions';
import { activeGoals, loadGoals, openGoalRoom } from './goals';
import { SignedOut, supabase, type Supabase, type SupabaseConfig } from './supabase';

/**
 * The tab's link to the person's LifeOS: off (this deployment names no project), signed out,
 * loading, ready with the records of each source, or a real error. Rooms read it; only the
 * sign-in sheet changes who is signed in.
 */
export type LifeosState = {
  status: 'off' | 'signed-out' | 'loading' | 'ready' | 'error';
  email: string | null;
  error?: string;
  records: SourceRecords;
};

let db: Supabase | null = null;
let state: LifeosState = { status: 'off', email: null, records: {} };
const listeners = new Set<() => void>();

function update(next: Partial<LifeosState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

/** Loads every source; a refresh after a change keeps the rooms on screen meanwhile. */
async function load(refresh = false) {
  if (!db) return;
  if (!refresh) update({ status: 'loading', error: undefined, email: db.email });
  try {
    const goals = await loadGoals(db);
    update({
      status: 'ready',
      records: { 'lifeos.goals': activeGoals(goals), 'lifeos.goals.all': goals },
    });
  } catch (error) {
    if (error instanceof SignedOut) update({ status: 'signed-out', email: null, records: {} });
    else update({ status: 'error', error: (error as Error).message });
  }
}

/** Called once the deployment says where LifeOS is; a kept session loads straight away. */
export function startLifeos(config: SupabaseConfig | null) {
  if (!config || db) return;
  db = supabase(config);
  if (db.email !== null) void load();
  else update({ status: 'signed-out' });
}

export async function signIn(email: string, password: string) {
  if (!db) throw new Error('LifeOS is not connected on this deployment.');
  await db.signIn(email, password);
  await load();
}

export async function signOut() {
  await db?.signOut();
  update({ status: 'signed-out', email: null, records: {}, error: undefined });
}

export const reloadLifeos = () => load();

/** The person entered a room opened from a LifeOS record; the database keeps the visit. */
export function enteredFrom(source: string, record: string) {
  if (!db || source !== 'lifeos.goals') return;
  openGoalRoom(db, record).catch((error) => {
    if (error instanceof SignedOut) update({ status: 'signed-out', email: null, records: {} });
    else console.error('Could not record the visit:', error);
  });
}

/**
 * One action on the person's LifeOS (the `lifeos.goals` source), already checked against the
 * room's declaration; on success the goals load again, so every room shows the change.
 */
export async function lifeosAction(action: string, args: Record<string, unknown>) {
  if (!db || state.status === 'signed-out' || state.status === 'off')
    return { error: 'Sign in to LifeOS first.' };
  try {
    const result = await goalAction(db, action, args);
    if (result.ok) await load(true);
    return result;
  } catch (error) {
    if (error instanceof SignedOut) {
      update({ status: 'signed-out', email: null, records: {} });
      return { error: 'The LifeOS session ended; sign in again.' };
    }
    return { error: (error as Error).message };
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLifeos(): LifeosState {
  return useSyncExternalStore(subscribe, () => state);
}
