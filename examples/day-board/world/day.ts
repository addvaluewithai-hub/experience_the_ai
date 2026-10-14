import {
  addRecord,
  updateRecord,
  type RoomData,
  type RoomRecord,
  type RoomSpec,
} from '@experience/room-spec';

export const GLASSES = 8;
export const KITCHEN_CLOSES = 21;
export const MEALS = ['فطار', 'غدا', 'عشا'] as const;
export const GYM = ['فكرت', 'خططت', 'رحت'] as const;

const pad = (n: number) => String(n).padStart(2, '0');
/** A day in the person's own time zone, as `date` fields store it. */
export const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Today's record of the habits, if any (the latest one for that day). */
export const todayOf = (data: RoomData, day: string): RoomRecord | undefined =>
  (data.days ?? []).filter((r) => r.values.day === day).at(-1);

/** Changes today's habits, creating today's record the first time. */
export function setToday(
  spec: RoomSpec,
  data: RoomData,
  day: string,
  change: Record<string, unknown>,
  newId: () => string,
): RoomData {
  const today = todayOf(data, day);
  return today
    ? updateRecord(spec, data, 'days', today.id, change)
    : addRecord(spec, data, 'days', { day, ...change }, newId());
}

/** The meals planned for a day, breakfast to dinner. */
export const mealsOn = (data: RoomData, day: string) =>
  (data.meals ?? [])
    .filter((r) => r.values.day === day)
    .sort((a, b) => MEALS.indexOf(a.values.meal as never) - MEALS.indexOf(b.values.meal as never));

/** The board in words, for the character to read before she speaks. */
export function describeDay(data: RoomData, now: Date): string {
  const today = todayOf(data, dayOf(now))?.values ?? {};
  const water = typeof today.water === 'number' ? today.water : 0;
  const week = Array.from({ length: 7 }, (_, i) => mealsOn(data, dayOf(addDays(now, i)))).flat();
  const shopping = data.shopping ?? [];
  const habits = [
    `water ${water} of ${GLASSES} glasses`,
    today.vitamins ? 'vitamins taken' : 'vitamins not yet',
    today.breakfast ? 'breakfast ready' : 'breakfast not ready',
    today.gym ? `gym: ${today.gym}` : 'gym: nothing yet',
    today.kitchen
      ? 'kitchen closed after dinner'
      : now.getHours() >= KITCHEN_CLOSES
        ? 'kitchen should be closed now (after 9 pm), not marked yet'
        : 'kitchen closes at 9 pm',
  ];
  return [
    `Today (${dayOf(now)}): ${habits.join(', ')}.`,
    `Week plan: ${week.length} meals over the next 7 days, ${week.filter((m) => m.values.done).length} done.`,
    `Shopping: ${shopping.length} items, ${shopping.filter((s) => s.values.bought).length} bought.`,
  ].join(' ');
}
