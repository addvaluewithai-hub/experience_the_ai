import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { PhaserFrame } from '../../../world/frame';
import { RiverModel } from './model';

const prefersLessMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The crystal river as a room surface: its crystals wake from the room's own data. */
export class RiverSurface implements RoomSurface {
  readonly model: RiverModel;
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    private spec: RoomSpec,
    store: RoomStore,
    options: { reducedMotion?: boolean; name?: () => string | null; today?: () => string } = {},
  ) {
    const model = new RiverModel({
      reducedMotion: options.reducedMotion ?? prefersLessMotion(),
      data: () => store.get(),
      name: options.name,
      today: options.today,
    });
    this.model = model;
    const load = () =>
      import('./scene').then(
        ({ startRiver }) =>
          (el: HTMLElement) =>
            startRiver(el, model).stop,
      );
    this.View = function RiverView(props: SurfaceViewProps) {
      return (
        <PhaserFrame
          world="crystal-river"
          label="نهر الكريستال: تلات كريستالات بتصحى مع غسيل السنان"
          background="#5b4a9e"
          frame={props.frame}
          load={load}
        />
      );
    };
  }

  /** Plays a scene; never waits more than 20 s, even if the world could not be drawn. */
  play(scene: string) {
    return Promise.race([
      this.model.play(scene),
      new Promise<void>((done) => setTimeout(done, 20_000)),
    ]);
  }
  act(character: string, action: string, args: Record<string, unknown>) {
    this.model.act(character, action, args);
  }
  speak(character: string | null) {
    this.model.speak(character);
  }
  get speaking() {
    return this.model.speaker;
  }
  setMode(character: string, mode: PresenceMode) {
    this.model.setMode(character, mode);
  }
  mouth(character: string, frame: MouthFrame | null) {
    this.model.mouth(character, frame);
  }
  state() {
    return this.model.state(this.spec.characters);
  }
}
