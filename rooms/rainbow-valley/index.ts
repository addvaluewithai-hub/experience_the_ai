import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import { ValleySurface } from './world/surface';

/** The valley and the world it draws itself (world/: Phaser, with the flight kit). */
const rainbowValley: RoomEntry = {
  spec: room,
  surface: (spec, store) => new ValleySurface(spec, store),
};
export default rainbowValley;
