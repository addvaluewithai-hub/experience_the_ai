import { useEffect, useState, type ComponentType } from 'react';
import type { MouthFrame, PresenceMode, RoomData, RoomRecord } from '@experience/room-spec';
import type { RoomSurface, SurfaceViewProps } from '@experience/room-runtime';

type Part = 'why' | 'progress' | 'chapters' | 'next';
const PARTS: Part[] = ['why', 'progress', 'chapters', 'next'];
const OPEN_SHOWN = 5;

const when = (value: unknown) =>
  typeof value === 'string'
    ? new Date(`${value}T12:00:00`).toLocaleDateString('en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
const today = () => new Date().toISOString().slice(0, 10);
const open = (r: RoomRecord) => r.values.done !== true && r.values.status !== 'cancelled';

/** What the goal room shows, read from its data: the companion reads the same records. */
function read(data: RoomData) {
  const goal = data.goal?.[0]?.values ?? {};
  const tasks = data.tasks ?? [];
  const chapters = data.milestones ?? [];
  const next = tasks.filter(open);
  return {
    goal,
    chapters,
    next,
    done: tasks.length - next.length,
    total: tasks.length,
    progress: typeof goal.progress === 'number' ? goal.progress : 0,
  };
}

/** A room where one goal is the whole interface; a part lights while the companion speaks of it. */
export class GoalSurface implements RoomSurface {
  readonly View: ComponentType<SurfaceViewProps>;
  speaking: string | null = null;
  private lit: Part | null = null;
  private listeners = new Set<() => void>();
  private shown = '';

  constructor() {
    const surface = this;
    this.View = function GoalView(props: SurfaceViewProps) {
      const [, redraw] = useState(0);
      useEffect(() => {
        void import('./goal.css');
        return surface.subscribe(() => redraw((n) => n + 1));
      }, []);
      const { goal, chapters, next, done, total, progress } = read(props.data);
      const late = typeof goal.target === 'string' && goal.target < today();
      surface.shown = `${props.spec.title}: ${progress}% · ${done} of ${total} actions done`;
      const part = (id: Part) => `goal-part${surface.lit === id ? ' is-lit' : ''}`;
      const who = props.spec.characters[0]?.name ?? 'your companion';
      return (
        <article className="goal-room">
          <header className="goal-head">
            <span className="goal-kicker">
              GOAL{goal.target ? ` · ${late ? 'TARGET PASSED' : 'BY'} ${when(goal.target)}` : ''}
            </span>
            <h2>{props.spec.title}</h2>
            {goal.why && <p className={`${part('why')} goal-why`}>{String(goal.why)}</p>}
          </header>
          <section className={part('progress')} aria-label="Progress">
            <div
              className="goal-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
            </div>
            <p className="goal-meta">
              <strong>{progress}%</strong>
              {total ? ` · ${done} of ${total} actions done` : ' · no actions yet'}
            </p>
          </section>
          <section className={part('chapters')} aria-labelledby="goal-chapters">
            <h3 id="goal-chapters">Chapters</h3>
            {chapters.length ? (
              <ol className="goal-chapters">
                {chapters.map((c, i) => (
                  <li key={c.id} className={`is-${String(c.values.status ?? 'not_started')}`}>
                    <span className="goal-index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="goal-text">{String(c.values.milestone)}</span>
                    {c.values.target && <time>{when(c.values.target)}</time>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="goal-empty">No chapters yet. Ask {who} to shape the first one.</p>
            )}
          </section>
          <section className={part('next')} aria-labelledby="goal-next">
            <h3 id="goal-next">Next</h3>
            {next.length ? (
              <ul className="goal-next">
                {next.slice(0, OPEN_SHOWN).map((t) => (
                  <li key={t.id} className={`is-${String(t.values.priority ?? 'medium')}`}>
                    <span className="goal-text">{String(t.values.task)}</span>
                    <span className="goal-note">
                      {t.values.status === 'blocked' ? 'Blocked' : ''}
                      {t.values.due ? ` ${when(t.values.due)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="goal-empty">
                {total ? 'Every action here is done.' : `No actions yet. ${who} can help.`}
              </p>
            )}
            {next.length > OPEN_SHOWN && (
              <p className="goal-meta">and {next.length - OPEN_SHOWN} more</p>
            )}
          </section>
          <p className="goal-foot">From your LifeOS. Changes are made there for now.</p>
        </article>
      );
    };
  }

  private subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private changed() {
    for (const listener of this.listeners) listener();
  }
  act(_character: string, action: string, args: Record<string, unknown>) {
    if (action !== 'spotlight' || !PARTS.includes(args.part as Part)) return;
    this.lit = args.part as Part;
    this.changed();
  }
  speak(character: string | null) {
    this.speaking = character;
    if (!character && this.lit) {
      this.lit = null;
      this.changed();
    }
  }
  setMode(_character: string, _mode: PresenceMode) {}
  mouth(_character: string, _frame: MouthFrame | null) {}
  state() {
    return `${this.shown || 'The goal is on screen.'}${this.lit ? ` The ${this.lit} part is lit.` : ''}`;
  }
}

export const goalSurface = () => new GoalSurface();
