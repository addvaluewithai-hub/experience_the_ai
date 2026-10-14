import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { Board, type Spotlight } from './Board';
import { describeDay } from './day';

/**
 * A person's day as a room surface. It is a working interface, not a scene: the character's world
 * action brings a part forward, and the state is the board read aloud.
 */
export class DaySurface implements RoomSurface {
  readonly View: ComponentType<SurfaceViewProps>;
  readonly spotlight: Spotlight = { section: null, listeners: new Set() };
  speaking: string | null = null;

  constructor(
    private store: RoomStore,
    private now: () => Date = () => new Date(),
  ) {
    const spotlight = this.spotlight;
    this.View = function DayView(props: SurfaceViewProps) {
      return <Board {...props} spotlight={spotlight} />;
    };
  }

  act(_character: string, action: string, args: Record<string, unknown>) {
    if (action !== 'show' || typeof args.section !== 'string') return;
    this.spotlight.section = args.section;
    for (const listener of this.spotlight.listeners) listener();
  }
  speak(character: string | null) {
    this.speaking = character;
  }
  setMode(_character: string, _mode: PresenceMode) {}
  mouth(_character: string, _frame: MouthFrame | null) {}
  state() {
    return describeDay(this.store.get(), this.now());
  }
}

export const daySurface = (_spec: RoomSpec, store: RoomStore) => new DaySurface(store);
