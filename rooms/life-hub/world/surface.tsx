import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from 'react';
import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomSurface, SurfaceViewProps } from '@experience/room-runtime';

export type DoorId = 'work' | 'learning' | 'wellbeing';
const DOORS: DoorId[] = ['work', 'learning', 'wellbeing'];

/** The room's bridge between AI actions, audio presence, and a Three.js scene. */
export class AtriumModel {
  private listeners = new Set<() => void>();
  selected: DoorId | null = null;
  speaking: string | null = null;
  mode: PresenceMode = 'idle';
  energy = 0;
  direction = 'arrival';
  private revision = 0;
  private until = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => String(this.revision);
  private changed() {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }
  focus(id: DoorId | null) {
    if (this.selected === id) return;
    this.selected = id;
    this.changed();
  }
  animate(scene: string) {
    this.direction = scene;
    this.until = performance.now() + (scene === 'arrival' ? 1600 : 650);
    if (scene === 'overview') this.focus(null);
    if (scene === 'to-work') this.focus('work');
    return new Promise<void>((resolve) => setTimeout(resolve, scene === 'arrival' ? 1600 : 650));
  }
  inScene(scene: string) {
    return this.direction === scene && performance.now() < this.until;
  }
  act(_character: string, action: string, args: Record<string, unknown>) {
    if (action === 'spotlight_door' && DOORS.includes(args.door as DoorId))
      this.focus(args.door as DoorId);
  }
  speak(character: string | null) {
    this.speaking = character;
    this.changed();
  }
  setMode(_character: string, mode: PresenceMode) {
    this.mode = mode;
  }
  mouth(_character: string, frame: MouthFrame | null) {
    this.energy = frame?.energy ?? 0;
  }
  state() {
    return (
      'Life Atrium. Work HQ is open; Learning Library and Wellbeing Garden are planned. ' +
      (this.selected
        ? 'The ' + this.selected + ' door is highlighted. '
        : 'All doors are visible. ') +
      (this.speaking ? 'Astra is speaking.' : 'Astra is present.')
    );
  }
}

/** A room-owned Three.js surface, mounted only while its world is displayed. */
export class AtriumSurface implements RoomSurface {
  readonly model = new AtriumModel();
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(private spec: RoomSpec) {
    const model = this.model;
    this.View = function AtriumView(props: SurfaceViewProps) {
      const mount = useRef<HTMLDivElement>(null);
      const [failed, setFailed] = useState(false);
      useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
      const children = props.spec.rooms ?? [];
      const choices = DOORS.map((id) => {
        const room = children.find((r) => r.id === id);
        return { id, title: room?.title ?? id, planned: Boolean(room?.planned) };
      });

      useEffect(() => {
        void import('./atrium.css');
        const element = mount.current;
        if (!element) return;
        let live = true;
        let stop = () => {};
        let entering = false;
        const choose = (id: DoorId) => {
          model.focus(id);
          const room = children.find((r) => r.id === id);
          if (room?.planned || !room || entering) return;
          entering = true;
          void model.animate('to-' + id).then(() => {
            if (live) props.world?.open(id);
          });
        };
        void import('./scene')
          .then(({ mountAtrium }) => mountAtrium(element, model, choose))
          .then((cleanup) => {
            if (live) stop = cleanup;
            else cleanup();
          })
          .catch(() => {
            if (live) setFailed(true);
          });
        return () => {
          live = false;
          stop();
        };
        // The parent route owns a stable scene for the lifetime of this room.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      const selected = model.selected;
      return (
        <div className="life-atrium">
          <div ref={mount} className="life-atrium-canvas" aria-hidden="true" />
          <div className="life-atrium-shade" />
          <header className="life-atrium-header">
            <span className="life-atrium-kicker">EXPERIENCE THE AI / YOUR WORLD</span>
            <h2>Life Atrium</h2>
            <p>Every part of your life, a place to step into.</p>
          </header>
          <div className="life-atrium-guide" aria-live="polite">
            <span className="life-atrium-guide-icon">✦</span>
            <span>
              {failed
                ? '3D is unavailable here; use the doors below.'
                : selected === 'work'
                  ? 'Work HQ is ready when you are.'
                  : selected === 'learning'
                    ? 'Learning Library is planned, not open yet.'
                    : selected === 'wellbeing'
                      ? 'Wellbeing Garden is planned, not open yet.'
                      : 'Choose a door, or ask Astra to guide you.'}
            </span>
          </div>
          <nav className="life-atrium-doors" aria-label="Life rooms">
            {choices.map(({ id, title, planned }) => (
              <button
                type="button"
                key={id}
                className={'life-atrium-door ' + (selected === id ? 'is-selected' : '')}
                onClick={() => {
                  model.focus(id);
                  if (!planned) void model.animate('to-' + id).then(() => props.world?.open(id));
                }}
                aria-label={title + (planned ? ', planned room' : ', enter room')}
              >
                <span className="life-atrium-door-symbol">
                  {id === 'work' ? '◈' : id === 'learning' ? '◇' : '✳'}
                </span>
                <span className="life-atrium-door-name">{title}</span>
                <span className="life-atrium-door-state">
                  {planned ? 'COMING LATER' : 'ENTER ↗'}
                </span>
              </button>
            ))}
          </nav>
          <p className="life-atrium-help">
            Select a door in the world or use the buttons. Your work stays in this tab for now.
          </p>
        </div>
      );
    };
  }

  get speaking() {
    return this.model.speaking;
  }
  speak(character: string | null) {
    this.model.speak(character);
  }
  setMode(character: string, mode: PresenceMode) {
    this.model.setMode(character, mode);
  }
  mouth(character: string, frame: MouthFrame | null) {
    this.model.mouth(character, frame);
  }
  act(character: string, action: string, args: Record<string, unknown>) {
    this.model.act(character, action, args);
  }
  state() {
    return this.model.state();
  }
  play(scene: string) {
    if (!this.spec.world?.scenes?.some((item) => item.id === scene)) return Promise.resolve();
    return this.model.animate(scene);
  }
}

export const atriumSurface = (spec: RoomSpec) => new AtriumSurface(spec);
