import { useEffect, useState, type ComponentType } from 'react';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';
import type { RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import { GoalCard, NewGoal } from './card';
import { LABEL, LIVE, overdue, stateOf, titleOf, type Goal } from './goal';
import { Resting, Sky } from './sky';
import { Timeline } from './timeline';

type View = 'sky' | 'timeline';
const count = (goals: Goal[], state: string) => goals.filter((g) => stateOf(g) === state).length;

/** The sky in words, for the Chairman's brief. */
function summary(goals: Goal[], view: View) {
  const late = goals.filter(overdue).map(titleOf);
  return [
    ...[...LIVE, 'completed', 'archived'].map(
      (s) => `${count(goals, s)} ${LABEL[s].toLowerCase()}`,
    ),
    late.length ? `past their target: ${late.join('; ')}` : '',
    `The person sees the ${view === 'sky' ? 'sky (goals by state)' : 'timeline (start to target)'}.`,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * The observatory: every goal by state (the sky) or in time (the timeline), a drawer for the
 * one opened, and a way to add one. The person acts from the drawer; the Chairman opens goals
 * while he talks and acts through his own service tools, which the host confirms.
 */
export class ObservatorySurface implements RoomSurface {
  readonly View: ComponentType<SurfaceViewProps>;
  speaking: string | null = null;
  private selected: string | null = null;
  private view: View = 'sky';
  private listeners = new Set<() => void>();
  private shown = '';

  constructor() {
    const surface = this;
    this.View = function ObservatoryView(props: SurfaceViewProps) {
      const [, redraw] = useState(0);
      const [adding, setAdding] = useState(false);
      useEffect(() => {
        void import('./observatory.css');
        void import('./card.css');
        void import('./timeline.css');
        return surface.subscribe(() => redraw((n) => n + 1));
      }, []);
      const goals = props.data.goals ?? [];
      const open = goals.find((g) => g.id === surface.selected);
      surface.shown = goals.length
        ? `${summary(goals, surface.view)}${open ? ` The drawer of "${titleOf(open)}" is open.` : ''}`
        : 'The sky is empty: no goals are loaded.';
      const choose = (id: string | null) => {
        setAdding(false);
        surface.choose(id === surface.selected ? null : id);
      };
      const views: View[] = ['sky', 'timeline'];
      return (
        <div className={open || adding ? 'observatory obs-with-drawer' : 'observatory'}>
          <header className="obs-head">
            <span className="obs-kicker">The Observatory</span>
            <h2>Everything you carry, from above.</h2>
            <dl className="obs-counts">
              {LIVE.map((state) => (
                <div key={state} className={`obs-count obs-${state}`}>
                  <dd>{count(goals, state)}</dd>
                  <dt>{LABEL[state]}</dt>
                </div>
              ))}
            </dl>
          </header>
          <div className="obs-bar-row">
            <div className="obs-views" role="tablist" aria-label="View">
              {views.map((view) => (
                <button
                  type="button"
                  role="tab"
                  key={view}
                  aria-selected={surface.view === view}
                  onClick={() => surface.show(view)}
                >
                  {view === 'sky' ? 'Sky' : 'Timeline'}
                </button>
              ))}
            </div>
            {props.world?.run && (
              <button
                type="button"
                className="obs-add"
                onClick={() => {
                  surface.choose(null);
                  setAdding(true);
                }}
              >
                + New goal
              </button>
            )}
          </div>
          {!goals.length && <p className="obs-none">Connect your life to see your goals here.</p>}
          {surface.view === 'sky' ? (
            <Sky goals={goals} selected={surface.selected} choose={choose} />
          ) : (
            <Timeline goals={goals} selected={surface.selected} choose={choose} />
          )}
          <Resting goals={goals} selected={surface.selected} choose={choose} />
          {adding && <NewGoal run={props.world?.run} close={() => setAdding(false)} />}
          {open && !adding && (
            <GoalCard
              key={open.id}
              goal={open}
              run={props.world?.run}
              close={() => surface.choose(null)}
            />
          )}
        </div>
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
  private choose(id: string | null) {
    this.selected = id;
    this.changed();
  }
  private show(view: View) {
    this.view = view;
    this.changed();
  }
  act(_character: string, action: string, args: Record<string, unknown>) {
    if (action === 'focus_goal' && typeof args.goal === 'string') this.choose(args.goal);
    if (action === 'show_view' && (args.view === 'sky' || args.view === 'timeline'))
      this.show(args.view);
  }
  speak(character: string | null) {
    this.speaking = character;
  }
  setMode(_character: string, _mode: PresenceMode) {}
  mouth(_character: string, _frame: MouthFrame | null) {}
  state() {
    return this.shown || 'The observatory is open.';
  }
}

export const observatorySurface = () => new ObservatorySurface();
