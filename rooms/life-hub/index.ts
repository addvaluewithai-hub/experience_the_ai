import { composeRoom } from '@experience/room-spec';
import type { RoomEntry } from '@experience/room-runtime';
import room from './room.json';
import work from './rooms/work/room.json';
import observatory from './rooms/observatory/room.json';
import { observatoryData } from './rooms/observatory/data';
import { observatorySurface } from './rooms/observatory/world/surface';
import { goalRoom } from './goals/build';
import { goalSurface } from './goals/surface';
import { atriumSurface } from './world/surface';

/**
 * The built Work HQ replaces its planned door; other doors remain planned. Above them, the
 * observatory shows every LifeOS goal with Orion. Once the person signs in to LifeOS, each
 * active goal also opens as its own room.
 */
const lifeHub: RoomEntry = {
  spec: composeRoom(room, [work, observatory]),
  surface: (spec, _store, path) =>
    path === 'life-hub'
      ? atriumSurface(spec)
      : path === 'life-hub/observatory'
        ? observatorySurface()
        : path.startsWith('life-hub/g-')
          ? goalSurface()
          : undefined,
  instances: { source: 'lifeos.goals', build: goalRoom },
  sourced: [{ path: 'observatory', source: 'lifeos.goals.all', data: observatoryData }],
};
export default lifeHub;
