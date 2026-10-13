import type { RoomEntry } from '@experience/room-runtime';
import rainbowValley from './rainbow-valley/room.json';

/**
 * The real rooms, built with the people who asked for them (docs/build-a-room.md). Register
 * each top room here as `{ spec: <its index.ts export>, panels: <its custom components> }`.
 * Engine examples live in examples/, not here.
 */
export const rooms: RoomEntry[] = [{ spec: rainbowValley }];
