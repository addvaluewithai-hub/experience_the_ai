import type { RoomEntry } from '@experience/room-runtime';
import rainbowValley from './rainbow-valley';

/**
 * The real rooms, built with the people who asked for them (docs/build-a-room.md). Register
 * each top room here with its index.ts export (`{ spec, panels?, surface? }`).
 * Engine examples live in examples/, not here.
 */
export const rooms: RoomEntry[] = [rainbowValley];
