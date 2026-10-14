import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import { kitchenSurface } from './world/surface';

/** Esraa's kitchen: Noor lives in it; the day's habits and plans are pinned to its things. */
const noorDay: RoomEntry = { spec: room, surface: kitchenSurface };
export default noorDay;
