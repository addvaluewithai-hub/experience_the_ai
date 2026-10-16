import { VOICES, type VoiceName } from '@experience/room-spec';
import template from './room.json';
import { PERSONAS } from './personas';

type Row = Record<string, unknown>;
const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim()
    ? value.trim().length > max
      ? `${value.trim().slice(0, max - 1)}…`
      : value.trim()
    : undefined;
const date = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((r): r is Row => Boolean(r) && typeof r === 'object') : [];
const order = (key: string) => (a: Row, b: Row) => Number(a[key] ?? 0) - Number(b[key] ?? 0);
const MILESTONE = ['not_started', 'active', 'completed', 'cancelled'];
const TASK = ['not_started', 'ready', 'in_progress', 'blocked', 'completed', 'cancelled'];
const PRIORITY = ['low', 'medium', 'high', 'critical'];
const oneOf = (value: unknown, options: string[]) =>
  typeof value === 'string' && options.includes(value) ? value : undefined;
/** Only declared values reach the room; empty ones are left out rather than invented. */
const values = (entries: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(entries).filter(([, v]) => v !== undefined));

/** The companion LifeOS chose for this goal, through the compiled personas, or the guide. */
function companion(agent: unknown) {
  const row = (agent && typeof agent === 'object' ? agent : {}) as Row;
  const key =
    typeof row.persona_key === 'string' && PERSONAS[row.persona_key] ? row.persona_key : 'guide';
  const base = PERSONAS[key];
  const voice = VOICES.find((v) => v === row.voice_name) as VoiceName | undefined;
  const name = text(row.name, 40) ?? base.name;
  return {
    id: 'companion',
    name,
    role: text(row.role, 60) ?? base.role,
    persona: base.persona,
    greeting: `I'm ${name}. Let's look at where this goal stands.`,
    capabilities: [],
    voice: voice ?? base.voice,
    notes: text(row.persona_notes, 600),
  };
}

/**
 * One LifeOS goal (as the platform's `lifeos.goals` source loads it) as an inner room of the
 * atrium and its data. Its words stay data: the title and purpose describe the room, and the
 * person's notes on how to be accompanied sit in the goal record, never in the persona.
 */
export function goalRoom(record: unknown): { spec: object; data: object } | null {
  const goal = (record && typeof record === 'object' ? record : {}) as Row;
  const id = typeof goal.id === 'string' && /^[0-9a-f-]{36}$/.test(goal.id) ? goal.id : null;
  const title = text(goal.title, 60);
  if (!id || !title) return null;
  const { notes, ...character } = companion(goal.agent);
  const milestones = rows(goal.milestones).sort(order('chapter_order'));
  const chapterOf = new Map(milestones.map((m) => [m.id, text(m.title, 600)]));
  const progress = typeof goal.progress === 'number' ? Math.round(goal.progress * 100) : undefined;
  const spec = {
    ...template,
    id: `g-${id}`,
    title,
    purpose: text(goal.why, 600) ?? text(goal.success_definition, 600) ?? template.purpose,
    characters: [character],
  };
  const createdAt = '';
  const data = {
    goal: [
      {
        id: 'goal',
        createdAt,
        values: values({
          why: text(goal.why, 600),
          success: text(goal.success_definition, 600),
          lived: text(goal.desired_lived_experience, 600),
          identity: text(goal.identity_connection, 600),
          target: date(goal.target_date),
          progress,
          notes,
        }),
      },
    ],
    milestones: milestones.flatMap((m) => {
      const milestone = text(m.title, 600);
      if (typeof m.id !== 'string' || !milestone) return [];
      return [
        {
          id: m.id,
          createdAt,
          values: values({
            milestone,
            status: oneOf(m.status, MILESTONE),
            target: date(m.target_date),
            done: m.status === 'completed',
          }),
        },
      ];
    }),
    tasks: rows(goal.tasks)
      .sort(order('task_order'))
      .flatMap((t) => {
        const task = text(t.title, 600);
        if (typeof t.id !== 'string' || !task) return [];
        return [
          {
            id: t.id,
            createdAt,
            values: values({
              task,
              status: oneOf(t.status, TASK),
              priority: oneOf(t.priority, PRIORITY),
              due: date(t.due_at),
              chapter: chapterOf.get(t.milestone_id),
              done: t.status === 'completed',
            }),
          },
        ];
      }),
  };
  return { spec, data };
}
