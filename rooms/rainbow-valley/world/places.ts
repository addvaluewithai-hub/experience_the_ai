/**
 * The valley's places in the flight box (x 0 left → 1 right, y 0 high sky → 1 the grass).
 * room.json names the same ids in its world actions; the valley test keeps them in step.
 */
export const PLACES = {
  'crystal-river': { label: 'نهر الكريستال', x: 0.16, y: 1, ground: true },
  meadow: { label: 'المرج', x: 0.5, y: 1, ground: true },
  'rainbow-bridge': { label: 'جسر قوس قزح', x: 0.82, y: 0.4, ground: false },
  'dream-sky': { label: 'سما الأحلام', x: 0.64, y: 0.03, ground: false },
  'near-laila': { label: 'قدام ليلى', x: 0.5, y: 0.55, ground: false },
} as const;
export type PlaceId = keyof typeof PLACES;
export const PLACE_IDS = Object.keys(PLACES) as PlaceId[];
export const GROUND_IDS = PLACE_IDS.filter((id) => PLACES[id].ground);

export const isPlace = (id: unknown): id is PlaceId =>
  typeof id === 'string' && Object.hasOwn(PLACES, id);

/** The place the unicorn is at, or null between places. */
export function placeAt(x: number, y: number, near = 0.06): PlaceId | null {
  let best: PlaceId | null = null;
  let distance = near;
  for (const id of PLACE_IDS) {
    const d = Math.hypot(PLACES[id].x - x, PLACES[id].y - y);
    if (d <= distance) [best, distance] = [id, d];
  }
  return best;
}
