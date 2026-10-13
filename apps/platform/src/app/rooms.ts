import { validateRoom, type RoomSpec } from '@experience/room-spec';
import {
  createRoomStore,
  type CustomPanels,
  type RoomEntry,
  type RoomStore,
} from '@experience/room-runtime';
import { examples } from '../../../../examples';
import { rooms } from '../../../../rooms';

/**
 * A room open in this tab, at its full path (e.g. "life/health/gym"). Every room in a tree
 * has its own store; there are no accounts yet, so data does not outlive a reload.
 */
export type OpenRoom = {
  key: string;
  spec: RoomSpec;
  store: RoomStore;
  panels: CustomPanels;
  parent?: OpenRoom;
  example: boolean;
};

/**
 * Rooms are compiled in; a tree that fails validation is reported and left out, never guessed.
 * Planned rooms are doors only, so they get no page.
 */
export function loadRooms(): { top: OpenRoom[]; all: Map<string, OpenRoom> } {
  const all = new Map<string, OpenRoom>();
  const add = (spec: RoomSpec, panels: CustomPanels, example: boolean, parent?: OpenRoom) => {
    const key = parent ? `${parent.key}/${spec.id}` : spec.id;
    const room: OpenRoom = { key, spec, store: createRoomStore(spec), panels, parent, example };
    all.set(key, room);
    for (const inner of spec.rooms ?? []) if (!inner.planned) add(inner, panels, example, room);
    return room;
  };
  const load = (entries: RoomEntry[], example: boolean) =>
    entries.flatMap((entry) => {
      const result = validateRoom(entry.spec);
      if (!result.ok) {
        console.error('Room left out:', result.errors);
        return [];
      }
      if (all.has(result.spec.id)) {
        console.error('Room left out, id already used:', result.spec.id);
        return [];
      }
      return [add(result.spec, entry.panels ?? {}, example)];
    });
  const top = [...load(rooms, false), ...load(examples, true)];
  return { top, all };
}

/** The room and the rooms above it, from the top. */
export function pathOf(room: OpenRoom): OpenRoom[] {
  return room.parent ? [...pathOf(room.parent), room] : [room];
}

export const roomHref = (key: string) => `#/room/${key}`;
