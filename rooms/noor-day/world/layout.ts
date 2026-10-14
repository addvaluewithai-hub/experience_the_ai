import type { WorldRect } from '@experience/kit-phaser';

/** The kitchen, in world pixels: everything is placed from these numbers. */
export const WORLD = { width: 1500, height: 620 };
export const FLOOR = 575;
export const COUNTER = { left: 350, right: 1080, top: 420 };

/** Where Noor can stand (the x of her feet) and what she is near there. */
export const SPOTS = {
  chalkboard: { x: 250, label: 'السبورة' },
  window: { x: 470, label: 'الشباك' },
  counter: { x: 720, label: 'الرخامة' },
  fridge: { x: 1030, label: 'التلاجة' },
  door: { x: 1290, label: 'الباب' },
} as const;
export type Spot = keyof typeof SPOTS;
export const isSpot = (v: unknown): v is Spot => typeof v === 'string' && Object.hasOwn(SPOTS, v);

/** Interface pinned to the kitchen: the habits on the chalkboard, the notes on the fridge. */
export const PINNED: Record<'board' | 'week' | 'shopping', WorldRect> = {
  board: { x: 50, y: 92, width: 264, height: 286 },
  week: { x: 1116, y: 246, width: 150, height: 116 },
  shopping: { x: 1128, y: 386, width: 128, height: 118 },
};

/** Where the gym bag waits for each step, nearer the door each time; gone once she went. */
export const BAG = { none: 1215, فكرت: 1252, خططت: 1290 } as const;

/** Where the camera rests when Noor is near the chalkboard, window and counter. */
export const HOME = 560;

/** The kitchen's hour: morning, day, evening or night (it closes at 9 pm). */
export function lightOf(hour: number) {
  if (hour >= 21 || hour < 6) return 'night';
  if (hour < 11) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
}
export type Light = ReturnType<typeof lightOf>;
