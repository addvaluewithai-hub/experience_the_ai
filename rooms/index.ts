import type { PanelComponent } from '@experience/room-runtime';
import kidsHabitPlanet from './kids-habit-planet/room.json';
import selfGrowthStudio from './self-growth-studio/room.json';
import studyRoom from './study-room/room.json';

/**
 * Every room the app ships, built in this repository from docs/build-a-room.md. A room's
 * custom panels are compiled in from its own folder; the app never loads room code at runtime.
 */
export type RoomEntry = { spec: unknown; panels?: Record<string, PanelComponent> };

export const rooms: RoomEntry[] = [
  { spec: kidsHabitPlanet },
  { spec: selfGrowthStudio },
  { spec: studyRoom },
];
