import {
  composeRoom,
  parseData,
  validateRoom,
  type RoomData,
  type RoomSpec,
} from '@experience/room-spec';
import {
  createRoomStore,
  type CustomPanels,
  type RoomEntry,
  type RoomStore,
  type RoomSurface,
} from '@experience/room-runtime';
import { examples } from '../../../../examples';
import { rooms } from '../../../../rooms';

/**
 * A room open in this tab, at its full path (e.g. "life/health/gym"). Every room in a tree
 * has its own store; compiled rooms keep their data in the tab only, rooms opened from a
 * source show what the source holds.
 */
export type OpenRoom = {
  key: string;
  spec: RoomSpec;
  store: RoomStore;
  panels: CustomPanels;
  parent?: OpenRoom;
  example: boolean;
  /** The room's own surface, when it declares a world; it lives while the tab is open. */
  surface?: RoomSurface;
  /** A top room whose tree opens rooms from this source once the person is signed in. */
  instances?: string;
  /** A room opened from a source record: which source, and the record's id there. */
  source?: { id: string; record: string };
  /** A compiled room whose data comes from this source. */
  sourced?: string;
};

/** Records each source has loaded, by source name. */
export type SourceRecords = Record<string, unknown[]>;

/** Inner rooms built from a source's records; the record id goes with each, for the host. */
function instancesOf(entry: RoomEntry, records: SourceRecords) {
  const built: { spec: object; data?: unknown; record: string }[] = [];
  for (const record of (entry.instances && records[entry.instances.source]) ?? []) {
    const id = (record as { id?: unknown })?.id;
    const room = typeof id === 'string' ? entry.instances!.build(record) : null;
    if (room && room.spec && typeof room.spec === 'object')
      built.push({ spec: room.spec, data: room.data, record: id as string });
  }
  return built;
}

/**
 * Rooms are compiled in; a tree that fails validation is reported and left out, never guessed.
 * Planned rooms are doors only, so they get no page. A tree with instances gets one inner room
 * per loaded record; if the grown tree fails validation, it opens without them. Rooms already
 * open keep their store and surface, so loading records never resets the tab.
 */
export function loadRooms(
  records: SourceRecords = {},
  previous?: Map<string, OpenRoom>,
): { top: OpenRoom[]; all: Map<string, OpenRoom> } {
  const all = new Map<string, OpenRoom>();
  const add = (
    spec: RoomSpec,
    entry: RoomEntry,
    example: boolean,
    parent?: OpenRoom,
    sourced?: Map<string, { data?: unknown; record: string }>,
  ) => {
    const key = parent ? `${parent.key}/${spec.id}` : spec.id;
    const before = previous?.get(key);
    const from = parent && !parent.parent ? sourced?.get(spec.id) : undefined;
    const path = key.split('/').slice(1).join('/');
    const fill = entry.sourced?.find((f) => f.path === path);
    let initial: RoomData | undefined;
    if (from || fill) {
      try {
        const raw = fill ? fill.data(records[fill.source] ?? []) : from!.data;
        initial = parseData(spec, raw ?? {});
      } catch (error) {
        console.error('Room data left out:', key, error);
      }
    }
    const store = before?.store ?? createRoomStore(spec, initial);
    if (before && initial) store.set(initial);
    const room: OpenRoom = { key, spec, store, panels: entry.panels ?? {}, parent, example };
    if (from && entry.instances) room.source = { id: entry.instances.source, record: from.record };
    if (!parent && entry.instances) room.instances = entry.instances.source;
    if (fill) room.sourced = fill.source;
    if (spec.world) room.surface = before?.surface ?? entry.surface?.(spec, store, key);
    all.set(key, room);
    for (const inner of spec.rooms ?? [])
      if (!inner.planned) add(inner, entry, example, room, sourced);
    return room;
  };
  const load = (entries: RoomEntry[], example: boolean) =>
    entries.flatMap((entry) => {
      const built = instancesOf(entry, records);
      let result = validateRoom(
        built.length
          ? composeRoom(
              entry.spec as object,
              built.map((b) => b.spec),
            )
          : entry.spec,
      );
      if (!result.ok && built.length) {
        console.error('Opened without its source rooms:', result.errors);
        built.length = 0;
        result = validateRoom(entry.spec);
      }
      if (!result.ok) {
        console.error('Room left out:', result.errors);
        return [];
      }
      if (all.has(result.spec.id)) {
        console.error('Room left out, id already used:', result.spec.id);
        return [];
      }
      const sourced = new Map(built.map((b) => [(b.spec as { id: string }).id, b]));
      return [add(result.spec, entry, example, undefined, sourced)];
    });
  const top = [...load(rooms, false), ...load(examples, true)];
  return { top, all };
}

/** The room and the rooms above it, from the top. */
export function pathOf(room: OpenRoom): OpenRoom[] {
  return room.parent ? [...pathOf(room.parent), room] : [room];
}

export const roomHref = (key: string) => `#/room/${key}`;
