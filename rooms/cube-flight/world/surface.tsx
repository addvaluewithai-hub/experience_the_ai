import { PhaserFrame } from '@experience/kit-phaser';
import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { GameBoard } from './board';
import { CubeModel } from './model';
import { cubeStyle } from './style';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class CubeSurface implements RoomSurface {
  readonly model = new CubeModel(reducedMotion());
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(readonly spec: RoomSpec, _store: RoomStore) {
    const model = this.model;
    const load = () =>
      import('./scene').then(
        ({ startCubeFlight }) =>
          (el: HTMLElement) =>
            startCubeFlight(el, model).stop,
      );
    this.View = function CubeView(props: SurfaceViewProps) {
      return (
        <PhaserFrame
          world="cube-flight"
          label="زوزو بتطير فوق مكعبات جدول الضرب"
          background="#eaf1ff"
          frame={props.frame}
          load={load}
          waking="زوزو جاية تطير…"
          failed="الرسم مش متاح دلوقتي."
        >
          <style>{cubeStyle}</style>
          <GameBoard {...props} model={model} />
        </PhaserFrame>
      );
    };
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
    return this.model.state();
  }
}

export const cubeFlightSurface = (spec: RoomSpec, store: RoomStore) =>
  new CubeSurface(spec, store);
