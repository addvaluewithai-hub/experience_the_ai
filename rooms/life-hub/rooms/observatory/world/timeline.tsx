import type { CSSProperties } from 'react';
import {
  LABEL,
  LIVE,
  dateOf,
  overdue,
  progressOf,
  stateOf,
  titleOf,
  today,
  when,
  type Goal,
} from './goal';

const DAY = 86_400_000;
const time = (date: string) => new Date(`${date}T00:00:00Z`).getTime();
const monthStart = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};
const addMonths = (t: number, n: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
};

/**
 * The window the timeline shows: from a little before today (or the oldest start still in
 * play) to a little after the furthest target, in whole months, never more than two years.
 */
function windowOf(goals: Goal[]) {
  const now = time(today());
  const starts = goals.flatMap((g) => dateOf(g.values.start) ?? []).map(time);
  const targets = goals.flatMap((g) => dateOf(g.values.target) ?? []).map(time);
  const from = monthStart(Math.max(Math.min(now - 60 * DAY, ...starts), now - 365 * DAY));
  const to = addMonths(Math.min(Math.max(now + 120 * DAY, ...targets), now + 730 * DAY), 1);
  const months: number[] = [];
  for (let m = from; m < to; m = addMonths(m, 1)) months.push(m);
  return { from, to, months, now };
}

/** Each goal in play as a line from its start to its target; the brass part is its progress. */
export function Timeline(props: {
  goals: Goal[];
  selected: string | null;
  choose: (id: string) => void;
}) {
  const live = props.goals.filter((g) => LIVE.includes(stateOf(g)));
  const { from, to, months, now } = windowOf(live);
  const share = (t: number) => (Math.min(Math.max(t, from), to) - from) / (to - from);
  const at = (t: number) => `${share(t) * 100}%`;
  return (
    <div
      className="obs-timeline"
      role="region"
      aria-label="Timeline"
      style={{ '--today': share(now) } as CSSProperties}
    >
      <i className="obs-today-line" aria-hidden="true" />
      <div className="obs-axis" aria-hidden="true">
        <span />
        <div className="obs-months">
          {months.map((m) => {
            const d = new Date(m);
            const label = d.toLocaleDateString('en', { month: 'short', timeZone: 'UTC' });
            const year = d.getUTCMonth() === 0 || m === from ? ` ${d.getUTCFullYear()}` : '';
            return (
              <span key={m} style={{ left: at(m) } as CSSProperties}>
                {label}
                {year}
              </span>
            );
          })}
          <i className="obs-today" style={{ left: at(now) }}>
            Today
          </i>
        </div>
      </div>
      {LIVE.map((state) => {
        const goals = live.filter((g) => stateOf(g) === state);
        if (!goals.length) return null;
        return (
          <section key={state} className={`obs-lane obs-${state}`} aria-label={LABEL[state]}>
            <h3>{LABEL[state]}</h3>
            {goals.map((goal) => {
              const start = dateOf(goal.values.start);
              const target = dateOf(goal.values.target);
              const left = start ? time(start) : now;
              const right = target ? time(target) : to;
              const bar = {
                left: at(Math.min(left, right)),
                width: `calc(${at(Math.max(left, right))} - ${at(Math.min(left, right))})`,
                '--fill': `${progressOf(goal)}%`,
              } as CSSProperties;
              const shape = [
                'obs-bar',
                target ? '' : 'obs-open',
                overdue(goal) ? 'obs-late' : '',
              ].join(' ');
              return (
                <button
                  type="button"
                  key={goal.id}
                  className="obs-row"
                  aria-pressed={props.selected === goal.id}
                  aria-label={`${titleOf(goal)}: ${start ? `since ${when(start)}` : 'no start'}, ${target ? `target ${when(target)}` : 'no target'}`}
                  onClick={() => props.choose(goal.id)}
                >
                  <span className="obs-row-title">{titleOf(goal)}</span>
                  <span className="obs-track">
                    <span className={shape} style={bar} />
                  </span>
                </button>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
