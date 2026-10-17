import type { RoomRecord } from '@experience/room-spec';

/** One goal as the observatory holds it (see ../data.ts). */
export type Goal = RoomRecord;
export type Run = (
  action: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export const LABEL: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  backlog: 'Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};
/** States still in play, in the order the sky and the timeline show them. */
export const LIVE = ['active', 'paused', 'backlog'];
export const RESTING = ['completed', 'cancelled', 'archived'];

export const stateOf = (goal: Goal) => String(goal.values.state ?? 'backlog');
export const titleOf = (goal: Goal) => String(goal.values.goal);
export const progressOf = (goal: Goal) =>
  typeof goal.values.progress === 'number' ? Math.max(0, Math.min(100, goal.values.progress)) : 0;
export const dateOf = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export const today = () => new Date().toISOString().slice(0, 10);

/** "Aug 30, 2026", or "Aug 2026" when short. */
export function when(value: unknown, short = false) {
  const date = dateOf(value);
  if (!date) return '';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en', {
    ...(short ? {} : { day: 'numeric' }),
    month: 'short',
    year: 'numeric',
  });
}

/** Past its target and not finished. */
export const overdue = (goal: Goal) => {
  const target = dateOf(goal.values.target);
  return Boolean(target && target < today() && LIVE.includes(stateOf(goal)));
};
