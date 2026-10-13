import { describeData, emptyData, type RoomData } from './data';
import type { RoomSpec } from './types';

/** Data of a room by its path relative to the room asking ('' is that room itself). */
export type DataAt = (path: string) => RoomData | undefined;
export type InnerRoom = { path: string; spec: RoomSpec; depth: number };

export const joinPath = (base: string, id: string) => (base ? `${base}/${id}` : id);

/** Every room inside this one, parents before their children, with relative paths. Planned
 * rooms are included; callers that need built rooms check `spec.planned`. */
export function innerRooms(spec: RoomSpec, base = '', depth = 1): InnerRoom[] {
  return (spec.rooms ?? []).flatMap((room) => {
    const path = joinPath(base, room.id);
    return [{ path, spec: room, depth }, ...innerRooms(room, path, depth + 1)];
  });
}

/**
 * How alive a room is, from 0 to 1. A room with a pulse uses its own data (no records yet is
 * 0); a room without one takes the average of its inner rooms; null when neither exists.
 */
export function pulseOf(spec: RoomSpec, dataAt: DataAt, path = ''): number | null {
  if (spec.planned) return null;
  if (spec.pulse) {
    const records = dataAt(path)?.[spec.pulse.collection] ?? [];
    if (!records.length) return 0;
    const field = spec.pulse.field;
    return records.filter((r) => r.values[field] === true).length / records.length;
  }
  const inner = (spec.rooms ?? [])
    .map((room) => pulseOf(room, dataAt, joinPath(path, room.id)))
    .filter((value): value is number => value !== null);
  return inner.length ? inner.reduce((sum, value) => sum + value, 0) / inner.length : null;
}

/** What a character can read about the rooms inside its own: who is there, how alive, what data. */
export function describeRooms(spec: RoomSpec, dataAt: DataAt, perCollection = 8): string {
  return innerRooms(spec)
    .map(({ path, spec: room, depth }) => {
      const indent = '  '.repeat(depth - 1);
      const pulse = pulseOf(room, dataAt, path);
      if (room.planned)
        return `${indent}- [${path}] ${room.icon ?? ''} ${room.title}: ${room.purpose} | planned, not built yet`;
      const people = room.characters.map((c) => `${c.name} (${c.role})`).join(', ');
      const alive = pulse === null ? 'no pulse' : `${Math.round(pulse * 100)}% alive`;
      const data = room.collections.length
        ? describeData(room, dataAt(path) ?? emptyData(room), perCollection)
        : '';
      const body = data
        .split('\n')
        .map((line) => `${indent}    ${line}`)
        .join('\n');
      return `${indent}- [${path}] ${room.icon ?? ''} ${room.title}: ${room.purpose} | ${people} | ${alive}${data ? `\n${body}` : ''}`;
    })
    .join('\n');
}

/**
 * Authoring helper for building a world room by room: a room.json lists its inner rooms
 * (planned stubs at first), and each inner room built in its own folder replaces the entry
 * with the same id. Built rooms the list does not name are appended. validateRoom still
 * checks the result.
 */
export function composeRoom(room: object, built: object[] = []): object {
  const listed = ((room as { rooms?: unknown }).rooms ?? []) as { id?: unknown }[];
  const byId = new Map(built.map((r) => [(r as { id?: unknown }).id, r]));
  const rooms = listed.map((entry) => byId.get(entry?.id) ?? entry);
  for (const r of built)
    if (!listed.some((entry) => entry?.id === (r as { id?: unknown }).id)) rooms.push(r);
  return rooms.length ? { ...room, rooms } : room;
}
