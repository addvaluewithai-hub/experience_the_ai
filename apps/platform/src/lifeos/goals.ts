import type { Supabase } from './supabase';

/** The active goals one atrium opens as rooms (its own doors and the observatory take the rest). */
export const ACTIVE_GOALS = 4;

const GOAL = [
  'id',
  'title',
  'why',
  'success_definition',
  'desired_lived_experience',
  'identity_connection',
  'starts_on',
  'target_date',
  'created_at',
  'status',
  'lifeos_goal_milestones(id,title,status,target_date,chapter_order)',
  'lifeos_goal_tasks(id,title,status,priority,due_at,task_order,milestone_id)',
  'lifeos_goal_rooms(lifeos_room_agents(persona_key,name,role,voice_name,persona_notes,is_primary,is_active))',
].join(',');

type Row = Record<string, unknown> & { id: string };

/** PostgREST embeds a one-to-one relation as an object and a one-to-many one as a list. */
const list = (value: unknown): Row[] =>
  Array.isArray(value)
    ? (value as Row[])
    : value && typeof value === 'object'
      ? [value as Row]
      : [];

/**
 * Every goal of the person as plain records, each with its milestones, tasks, computed
 * progress (0–1, from the lifeos_goal_progress view) and the active primary character chosen
 * for its room, if any. Reads only, with the person's token. The sources: `lifeos.goals` (the
 * first active ones, each a room) and `lifeos.goals.all` (all of them, for the observatory).
 */
export async function loadGoals(db: Supabase): Promise<Row[]> {
  const goals = await db.get<Row[]>(`lifeos_goals?select=${GOAL}&order=created_at.asc&limit=200`);
  if (!goals.length) return [];
  const ids = goals.map((g) => g.id).join(',');
  const progress = await db.get<{ goal_id: string; computed_progress: number | string }[]>(
    `lifeos_goal_progress?select=goal_id,computed_progress&goal_id=in.(${ids})`,
  );
  return goals.map(({ lifeos_goal_rooms, lifeos_goal_milestones, lifeos_goal_tasks, ...goal }) => {
    const agents = list(lifeos_goal_rooms).flatMap((room) => list(room.lifeos_room_agents));
    const value = progress.find((p) => p.goal_id === goal.id)?.computed_progress;
    return {
      ...goal,
      milestones: list(lifeos_goal_milestones),
      tasks: list(lifeos_goal_tasks),
      progress: value === undefined ? null : Number(value),
      agent: agents.find((a) => a.is_primary === true && a.is_active === true) ?? null,
    };
  });
}

export const activeGoals = (goals: Row[]) =>
  goals.filter((g) => g.status === 'active').slice(0, ACTIVE_GOALS);

/** Marks the goal's room as visited (and creates it on the first visit). */
export async function openGoalRoom(db: Supabase, goalId: string) {
  await db.rpc('lifeos_open_goal_room', { p_goal_id: goalId });
}
