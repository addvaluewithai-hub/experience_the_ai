import type { Supabase } from './supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STATES = ['active', 'paused', 'backlog', 'completed', 'archived'];
const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * What the `lifeos.goals` source can do, each through one reviewed database function that
 * checks the person owns the goal. A room names these actions; anything else is refused here.
 */
export async function goalAction(
  db: Supabase,
  action: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (action === 'create_goal') {
    const title = text(args.title);
    const target = text(args.target_date);
    if (!title) return { error: 'A goal needs a title.' };
    if (target && !DATE.test(target)) return { error: 'The target date must be YYYY-MM-DD.' };
    const id = await db.rpc<string>('lifeos_create_goal', {
      p_title: title,
      p_why: text(args.why),
      p_success_definition: text(args.success),
      p_target_date: target || null,
      p_status: args.start_now === true ? 'active' : 'backlog',
    });
    return { ok: true, goalId: id };
  }
  const goal = text(args.goal);
  if (!UUID.test(goal)) return { error: 'Name the goal by its id in [brackets].' };
  if (action === 'set_goal_status') {
    if (!STATES.includes(String(args.status))) return { error: 'That is not a goal state.' };
    await db.rpc('lifeos_set_goal_status', { p_goal_id: goal, p_status: args.status });
    return { ok: true, status: args.status };
  }
  if (action === 'delete_empty_goal') {
    await db.rpc('lifeos_delete_empty_goal', { p_goal_id: goal });
    return { ok: true, deleted: goal };
  }
  return { error: `LifeOS cannot ${action}.` };
}
