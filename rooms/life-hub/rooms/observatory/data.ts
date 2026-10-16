type Row = Record<string, unknown>;
const STATES = ['active', 'paused', 'backlog', 'completed', 'cancelled', 'archived'];
const text = (value: unknown, max = 600) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);
const OPEN = (task: Row) => task.status !== 'completed' && task.status !== 'cancelled';

/**
 * Every LifeOS goal (the `lifeos.goals.all` source) as one record of the observatory: its
 * state, progress, target and how much is planned under it. The record id is the goal's id,
 * so Orion names goals by it and the host can show their titles when it asks the person.
 */
export function observatoryData(records: unknown[]) {
  const goals = records.flatMap((record) => {
    const goal = (record && typeof record === 'object' ? record : {}) as Row;
    const title = text(goal.title);
    if (typeof goal.id !== 'string' || !title) return [];
    const tasks = rows(goal.tasks);
    const target = typeof goal.target_date === 'string' ? goal.target_date.slice(0, 10) : '';
    const values: Record<string, unknown> = {
      goal: title,
      state: STATES.includes(String(goal.status)) ? goal.status : undefined,
      progress: typeof goal.progress === 'number' ? Math.round(goal.progress * 100) : undefined,
      target: /^\d{4}-\d{2}-\d{2}$/.test(target) ? target : undefined,
      why: text(goal.why),
      actions: tasks.length,
      open: tasks.filter(OPEN).length,
      empty: !tasks.length && !rows(goal.milestones).length,
    };
    for (const key of Object.keys(values)) if (values[key] === undefined) delete values[key];
    return [{ id: goal.id, createdAt: '', values }];
  });
  return { goals };
}
