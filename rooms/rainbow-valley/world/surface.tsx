import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomData } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { PhaserFrame } from './frame';
import { ValleyModel } from './model';

const prefersLessMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Rainbow Valley as a room surface: the conversation writes the model, Phaser draws it. */
export class ValleySurface implements RoomSurface {
  readonly model: ValleyModel;
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    private spec: RoomSpec,
    store?: RoomStore,
    options: { reducedMotion?: boolean; river?: () => RoomData | undefined } = {},
  ) {
    const model = new ValleyModel({
      reducedMotion: options.reducedMotion ?? prefersLessMotion(),
      memory: () => store?.get(),
      river: options.river,
    });
    this.model = model;
    const load = () =>
      import('./scene').then(
        ({ startValley }) =>
          (el: HTMLElement) =>
            startValley(el, model).stop,
      );
    this.View = function ValleyView(props: SurfaceViewProps) {
      return (
        <PhaserFrame
          world="rainbow-valley"
          label="وادي قوس قزح: اليونيكورن الطايرة وجدّة القمر"
          background="#4a3a8c"
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
