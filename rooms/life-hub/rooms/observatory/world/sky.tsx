import type { CSSProperties } from 'react';
import {
  LABEL,
  LIVE,
  RESTING,
  overdue,
  progressOf,
  stateOf,
  titleOf,
  when,
  type Goal,
} from './goal';

const EMPTY: Record<string, string> = {
  active: 'Nothing is moving yet.',
  paused: 'Nothing on hold.',
  backlog: 'Nothing waiting.',
};

type Choose = (id: string) => void;

function Star(props: { goal: Goal; selected: boolean; choose: Choose }) {
  const { goal } = props;
  const progress = progressOf(goal);
  const state = stateOf(goal);
  const meta =
    state === 'backlog'
      ? ''
      : [
          `${progress}%`,
          goal.values.target
            ? `${overdue(goal) ? 'passed' : 'by'} ${when(goal.values.target, true)}`
            : '',
        ]
          .filter(Boolean)
          .join(' · ');
  return (
    <li>
      <button
        type="button"
        className="obs-star"
        aria-pressed={props.selected}
        aria-label={`${titleOf(goal)}, ${state}, ${progress}%`}
        onClick={() => props.choose(goal.id)}
      >
        <span
          className="obs-light"
          aria-hidden="true"
          style={{ '--size': `${6 + progress * 0.1}px` } as CSSProperties}
        />
        <span className="obs-text">
          <span className="obs-name">{titleOf(goal)}</span>
          {meta && <span className={overdue(goal) ? 'obs-sub obs-late' : 'obs-sub'}>{meta}</span>}
        </span>
      </button>
    </li>
  );
}

/** Three columns of the sky by state; each goal a star whose glow grows with its progress. */
export function Sky(props: { goals: Goal[]; selected: string | null; choose: Choose }) {
  return (
    <div className="obs-sky">
      {LIVE.map((state) => {
        const goals = props.goals.filter((g) => stateOf(g) === state);
        return (
          <section key={state} className={`obs-band obs-${state}`} aria-label={LABEL[state]}>
            <h3>
              {LABEL[state]} <span>{goals.length}</span>
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
              <p className="obs-none">{EMPTY[state]}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Completed, cancelled and archived goals: a quiet line below, still reachable. */
export function Resting(props: { goals: Goal[]; selected: string | null; choose: Choose }) {
  const resting = props.goals.filter((g) => RESTING.includes(stateOf(g)));
  if (!resting.length) return null;
  return (
    <nav className="obs-resting" aria-label="Completed and archived">
      <span>Resting</span>
      {resting.map((goal) => (
        <button
          type="button"
          key={goal.id}
          aria-pressed={props.selected === goal.id}
          onClick={() => props.choose(goal.id)}
        >
          {stateOf(goal) === 'completed' ? '✓ ' : ''}
          {titleOf(goal)}
        </button>
      ))}
    </nav>
  );
}
