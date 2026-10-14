import type { RoomEntry } from '@experience/room-runtime';
import classroomStage from './classroom-stage';
import dayBoard from './day-board';
import kidsHabitPlanet from './kids-habit-planet/room.json';
import nestedHouse from './nested-house';
import selfGrowthStudio from './self-growth-studio/room.json';
import spaceTrip from './space-trip';
import studyRoom from './study-room/room.json';

/**
 * Synthetic rooms that exercise the engine in development and tests. They are not product
 * rooms: do not extend them for a person; build real rooms under rooms/.
 */
export const examples: RoomEntry[] = [
  classroomStage,
  spaceTrip,
  { spec: nestedHouse },
  { spec: kidsHabitPlanet },
  { spec: selfGrowthStudio },
  { spec: studyRoom },
  dayBoard,
];
