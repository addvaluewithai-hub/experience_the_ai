import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import { daySurface } from './world/surface';

/** A docked room: a working board in its own style, with its character beside it. */
const dayBoard: RoomEntry = { spec: room, surface: daySurface };
export default dayBoard;
