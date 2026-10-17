import { useState, type FormEvent, type ReactNode } from 'react';
import { LABEL, overdue, progressOf, stateOf, titleOf, when, type Goal, type Run } from './goal';

const MOVES: Record<string, { label: string; status: string }[]> = {
  active: [
    { label: 'Pause', status: 'paused' },
    { label: 'Mark complete', status: 'completed' },
  ],
  paused: [
    { label: 'Resume', status: 'active' },
    { label: 'Back to waiting', status: 'backlog' },
  ],
  backlog: [{ label: 'Make active', status: 'active' }],
  completed: [{ label: 'Reopen', status: 'active' }],
  cancelled: [{ label: 'Back to waiting', status: 'backlog' }],
  archived: [{ label: 'Restore', status: 'backlog' }],
};

/** Runs one action and keeps what the person sees honest: busy, then done or the real error. */
function useRun(run: Run | undefined) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const go = async (action: string, args: Record<string, unknown>) => {
    if (!run) {
      setError('Connect your life to change goals.');
      return false;
    }
    setBusy(true);
    setError('');
    const result = await run(action, args);
    setBusy(false);
    if ('error' in result) setError(String(result.error));
    return result.ok === true;
  };
  return { busy, error, go };
}

function Drawer(props: { label: string; close: () => void; children: ReactNode }) {
  return (
    <aside className="obs-drawer" aria-label={props.label}>
      <button type="button" className="obs-close" aria-label="Close" onClick={props.close}>
        ×
      </button>
      {props.children}
    </aside>
  );
}

/** One goal: where it stands, its dates, and what the person can decide about it. */
export function GoalCard(props: { goal: Goal; run?: Run; close: () => void }) {
  const { goal } = props;
  const { busy, error, go } = useRun(props.run);
  const [armed, setArmed] = useState(false);
  const state = stateOf(goal);
  const progress = progressOf(goal);
  const status = (next: string) => void go('set_goal_status', { goal: goal.id, status: next });
  const archive = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    status('archived');
  };
  const dates = [
    goal.values.start ? `Since ${when(goal.values.start)}` : '',
    goal.values.target
      ? `${overdue(goal) ? 'Target passed' : 'Target'} ${when(goal.values.target)}`
      : 'No target date',
  ].filter(Boolean);
  return (
    <Drawer label={titleOf(goal)} close={props.close}>
      <span className="obs-kicker">{LABEL[state] ?? state}</span>
      <h3>{titleOf(goal)}</h3>
      {goal.values.why && <p className="obs-why">{String(goal.values.why)}</p>}
      <div className="obs-line" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <dl className="obs-facts">
        <div>
          <dt>Progress</dt>
          <dd>{progress}%</dd>
        </div>
        <div>
          <dt>Open actions</dt>
          <dd>
            {Number(goal.values.open ?? 0)} of {Number(goal.values.actions ?? 0)}
          </dd>
        </div>
      </dl>
      <p className={overdue(goal) ? 'obs-dates obs-late' : 'obs-dates'}>{dates.join(' · ')}</p>
      <div className="obs-moves">
        {(MOVES[state] ?? []).map((move, i) => (
          <button
            type="button"
            key={move.status}
            className={i ? 'obs-quiet' : undefined}
            disabled={busy}
            onClick={() => status(move.status)}
          >
            {move.label}
          </button>
        ))}
        {state !== 'archived' && (
          <button type="button" className="obs-quiet" disabled={busy} onClick={archive}>
            {armed ? 'Tap again to archive' : 'Archive'}
          </button>
        )}
      </div>
      {error && (
        <p className="obs-error" role="alert">
          {error}
        </p>
      )}
    </Drawer>
  );
}

/** A new goal, waiting unless the person starts it now. */
export function NewGoal(props: { run?: Run; close: () => void }) {
  const { busy, error, go } = useRun(props.run);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [target, setTarget] = useState('');
  const [now, setNow] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const args = { title: title.trim(), why: why.trim(), target_date: target, start_now: now };
    if (await go('create_goal', args)) props.close();
  };
  return (
    <Drawer label="New goal" close={props.close}>
      <form className="obs-form" onSubmit={(event) => void submit(event)}>
        <span className="obs-kicker">New goal</span>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </label>
        <label>
          Why it matters
          <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} />
        </label>
        <label>
          Target date
          <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <label className="obs-check">
          <input type="checkbox" checked={now} onChange={(e) => setNow(e.target.checked)} />
          Start it now
        </label>
        <div className="obs-moves">
          <button type="submit" disabled={busy || !title.trim()}>
            {busy ? 'Adding…' : 'Add goal'}
          </button>
        </div>
        {error && (
          <p className="obs-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Drawer>
  );
}
