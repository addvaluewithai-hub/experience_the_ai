import { composeRoom } from '@experience/room-spec';
import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import work from './rooms/work/room.json';
import { atriumSurface } from './world/surface';

/** The built Work HQ replaces its planned door; other doors remain planned. */
const lifeHub: RoomEntry = {
  spec: composeRoom(room, [work]),
  surface: (spec, _store, path) => (path === 'life-hub' ? atriumSurface(spec) : undefined),
};
export default lifeHub;
