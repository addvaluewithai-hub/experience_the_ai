import type { CSSProperties } from 'react';
import type { RoomRecord } from '@experience/room-spec';

export type Goal = RoomRecord;
const BANDS = [
  { id: 'active', label: 'Active', empty: 'Nothing is moving yet.' },
  { id: 'paused', label: 'Paused', empty: 'Nothing on hold.' },
  { id: 'backlog', label: 'Waiting', empty: 'Nothing waiting.' },
] as const;
export const RESTING = ['completed', 'cancelled', 'archived'];

/** A stable 0–1 from the goal's id, so each star keeps its place in the sky between visits. */
function drift(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export const stateOf = (goal: Goal) => String(goal.values.state ?? 'backlog');
const progressOf = (goal: Goal) =>
  typeof goal.values.progress === 'number' ? Math.max(0, Math.min(100, goal.values.progress)) : 0;

function Star(props: { goal: Goal; selected: boolean; choose: (id: string) => void }) {
  const { goal } = props;
  const progress = progressOf(goal);
  const style = {
    '--drift': `${Math.round(drift(goal.id) * 46)}%`,
    '--size': `${7 + progress * 0.13}px`,
  } as CSSProperties;
  return (
    <li style={style}>
      <button
        type="button"
        className="obs-star"
        aria-pressed={props.selected}
        aria-label={`${String(goal.values.goal)}, ${stateOf(goal)}, ${progress}%`}
        onClick={() => props.choose(goal.id)}
      >
        <span className="obs-light" aria-hidden="true" />
        <span className="obs-name">{String(goal.values.goal)}</span>
      </button>
    </li>
  );
}

/** Three regions of the sky by state; each goal a star whose glow grows with its progress. */
export function Sky(props: {
  goals: Goal[];
  selected: string | null;
  choose: (id: string) => void;
}) {
  return (
    <div className="obs-sky">
      {BANDS.map((band) => {
        const goals = props.goals.filter((g) => stateOf(g) === band.id);
        return (
          <section key={band.id} className={`obs-band obs-${band.id}`} aria-label={band.label}>
            <h3>
              {band.label} <span>{goals.length}</span>
            </h3>
            {goals.length ? (
              <ol>
                {goals.map((goal) => (
                  <Star
                    key={goal.id}
                    goal={goal}
                    selected={props.selected === goal.id}
                    choose={props.choose}
                  />
                ))}
              </ol>
            ) : (
              <p className="obs-none">{band.empty}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Completed, cancelled and archived goals: a quiet line below the sky, still reachable. */
export function Resting(props: {
  goals: Goal[];
  selected: string | null;
  choose: (id: string) => void;
}) {
  const resting = props.goals.filter((g) => RESTING.includes(stateOf(g)));
  if (!resting.length) return null;
  return (
    <nav className="obs-resting" aria-label="Completed and archived">
      {resting.map((goal) => (
        <button
          type="button"
          key={goal.id}
          aria-pressed={props.selected === goal.id}
          onClick={() => props.choose(goal.id)}
        >
          <span aria-hidden="true">{stateOf(goal) === 'completed' ? '✓' : '·'}</span>
          {String(goal.values.goal)}
        </button>
      ))}
    </nav>
  );
}
