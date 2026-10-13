import { useSyncExternalStore } from 'react';
import { emptyData, type RoomData, type RoomSpec } from '@experience/room-spec';

/**
 * Holds one room's data for the host. The runtime never decides where data lives: a preview
 * keeps it in memory, a signed-in host will load and save it through its own adapter.
 */
export type RoomStore = {
  get: () => RoomData;
  set: (next: RoomData) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createRoomStore(spec: RoomSpec, initial?: RoomData): RoomStore {
  let data = initial ?? emptyData(spec);
  const listeners = new Set<() => void>();
  return {
    get: () => data,
    set(next) {
      data = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useRoomData(store: RoomStore): RoomData {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export function newRecordId() {
  return crypto.randomUUID().slice(0, 8);
}
