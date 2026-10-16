import { composeRoom } from '@experience/room-spec';
import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import work from './rooms/work/room.json';
import { goalRoom } from './goals/build';
import { goalSurface } from './goals/surface';
import { atriumSurface } from './world/surface';

/**
 * The built Work HQ replaces its planned door; other doors remain planned. Once the person
 * signs in to LifeOS, each active goal opens as its own room beside them.
 */
const lifeHub: RoomEntry = {
  spec: composeRoom(room, [work]),
  surface: (spec, _store, path) =>
    path === 'life-hub'
      ? atriumSurface(spec)
      : path.startsWith('life-hub/g-')
        ? goalSurface()
        : undefined,
  instances: { source: 'lifeos.goals', build: goalRoom },
};
export default lifeHub;
