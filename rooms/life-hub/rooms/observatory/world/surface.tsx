import { useEffect, useState, type ComponentType } from 'react';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';
import type { RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import { GoalCard, NewGoal } from './card';
import { Resting, Sky, stateOf, type Goal } from './sky';

const count = (goals: Goal[], state: string) => goals.filter((g) => stateOf(g) === state).length;

/** The sky in words, for the Chairman's brief and the person's first glance. */
function summary(goals: Goal[]) {
  const done = count(goals, 'completed');
  const archived = count(goals, 'archived');
  return [
    `${count(goals, 'active')} active`,
    `${count(goals, 'paused')} paused`,
    `${count(goals, 'backlog')} waiting`,
    ...(done ? [`${done} completed`] : []),
    ...(archived ? [`${archived} archived`] : []),
  ].join(' · ');
}

/**
 * The observatory: every goal as a star, a card for the one opened, and a way to add one.
 * The person acts from the card; the Chairman opens stars while he talks and acts through his
 * own service tools, which the host confirms with the person.
 */
export class ObservatorySurface implements RoomSurface {
  readonly View: ComponentType<SurfaceViewProps>;
  speaking: string | null = null;
  private selected: string | null = null;
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
        return surface.subscribe(() => redraw((n) => n + 1));
      }, []);
      const goals = props.data.goals ?? [];
      const open = goals.find((g) => g.id === surface.selected);
      surface.shown = goals.length
        ? `${summary(goals)}.${open ? ` The card of "${String(open.values.goal)}" is open.` : ''}`
        : 'The sky is empty: no goals are loaded.';
      const choose = (id: string | null) => {
        setAdding(false);
        surface.choose(id === surface.selected ? null : id);
      };
      return (
        <div className="observatory">
          <header className="obs-head">
            <span className="obs-kicker">LIFE ATRIUM / THE OBSERVATORY</span>
            <h2>Everything you carry, from above.</h2>
            <p>{goals.length ? summary(goals) : 'Connect your life to see your goals here.'}</p>
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
          </header>
          <Sky goals={goals} selected={surface.selected} choose={choose} />
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
  private choose(id: string | null) {
    this.selected = id;
    for (const listener of this.listeners) listener();
  }
  act(_character: string, action: string, args: Record<string, unknown>) {
    if (action === 'focus_goal' && typeof args.goal === 'string') this.choose(args.goal);
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
