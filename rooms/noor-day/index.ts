import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import { daySurface } from './world/surface';

/** Esraa's day: a working interface in its own style (world/), with Noor docked beside it. */
const noorDay: RoomEntry = { spec: room, surface: daySurface };
export default noorDay;
