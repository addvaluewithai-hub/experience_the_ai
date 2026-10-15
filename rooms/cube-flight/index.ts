import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import { cubeFlightSurface } from './world/surface';

/** Standalone memory practice room: math and scheduling are local code, never the model. */
const cubeFlight: RoomEntry = { spec: room, surface: cubeFlightSurface };
export default cubeFlight;
