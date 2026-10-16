import { useState, type FormEvent } from 'react';
import { stateOf, type Goal } from './sky';

export type Run = (
  action: string,
  args: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

const MOVES: Record<string, { label: string; status: string }[]> = {
  active: [
    { label: 'Pause', status: 'paused' },
    { label: 'Mark complete', status: 'completed' },
  ],
  paused: [
    { label: 'Make active', status: 'active' },
    { label: 'Back to waiting', status: 'backlog' },
  ],
  backlog: [{ label: 'Make active', status: 'active' }],
  completed: [{ label: 'Reopen', status: 'active' }],
  cancelled: [{ label: 'Back to waiting', status: 'backlog' }],
  archived: [{ label: 'Restore', status: 'backlog' }],
};
const STATE: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  backlog: 'Waiting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
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

/** One goal opened from the sky: where it stands, and what the person can decide about it. */
export function GoalCard(props: { goal: Goal; run?: Run; close: () => void }) {
  const { goal } = props;
  const { busy, error, go } = useRun(props.run);
  const [armed, setArmed] = useState<'archive' | 'delete' | null>(null);
  const state = stateOf(goal);
  const progress = typeof goal.values.progress === 'number' ? goal.values.progress : 0;
  const status = (next: string) => void go('set_goal_status', { goal: goal.id, status: next });
  const twice = async (what: 'archive' | 'delete') => {
    if (armed !== what) return setArmed(what);
    setArmed(null);
    if (what === 'archive') return status('archived');
    if (await go('delete_empty_goal', { goal: goal.id })) props.close();
  };
  return (
    <aside className="obs-card" aria-labelledby="obs-card-title">
      <button type="button" className="obs-close" aria-label="Close" onClick={props.close}>
        ×
      </button>
      <span className="obs-kicker">{STATE[state] ?? state}</span>
      <h3 id="obs-card-title">{String(goal.values.goal)}</h3>
      {goal.values.why && <p className="obs-why">{String(goal.values.why)}</p>}
      <div className="obs-line" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="obs-meta">
        <strong>{progress}%</strong> · {Number(goal.values.open ?? 0)} open of{' '}
        {Number(goal.values.actions ?? 0)} actions
        {goal.values.target ? ` · target ${String(goal.values.target)}` : ''}
      </p>
      <div className="obs-moves">
        {(MOVES[state] ?? []).map((move) => (
          <button
            type="button"
            key={move.status}
            disabled={busy}
            onClick={() => status(move.status)}
          >
            {move.label}
          </button>
        ))}
        {state !== 'archived' && (
          <button
            type="button"
            className="obs-quiet"
            disabled={busy}
            onClick={() => void twice('archive')}
          >
            {armed === 'archive' ? 'Tap again to archive' : 'Archive'}
          </button>
        )}
        {goal.values.empty === true && (
          <button
            type="button"
            className="obs-quiet"
            disabled={busy}
            onClick={() => void twice('delete')}
          >
            {armed === 'delete' ? 'Tap again to delete' : 'Delete'}
          </button>
        )}
      </div>
      {error && (
        <p className="obs-error" role="alert">
          {error}
        </p>
      )}
    </aside>
  );
}

/** A new goal, waiting unless the person starts it now. */
export function NewGoal(props: { run?: Run; close: () => void }) {
  const { busy, error, go } = useRun(props.run);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [now, setNow] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await go('create_goal', { title: title.trim(), why: why.trim(), start_now: now }))
      props.close();
  };
  return (
    <form className="obs-card" aria-label="New goal" onSubmit={(event) => void submit(event)}>
      <button type="button" className="obs-close" aria-label="Close" onClick={props.close}>
        ×
      </button>
      <span className="obs-kicker">New goal</span>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>
      <label>
        Why it matters
        <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={300} />
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
  );
}
