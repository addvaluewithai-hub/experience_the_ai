import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { LumiAvatar } from './avatar';
import { GameBoard } from './board';
import { CubeModel } from './model';
import { cubeStyle } from './style';

/** Reuses PixiLive's own SVG art and motion rig; no duplicate Phaser mascot. */
export class CubeSurface implements RoomSurface {
  readonly model = new CubeModel();
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    readonly spec: RoomSpec,
    _store: RoomStore,
  ) {
    const model = this.model;
    this.View = function CubeView(props: SurfaceViewProps) {
      return (
        <div
          className="cf-stage"
          data-world="cube-flight"
          role="group"
          aria-label="لعبة مكعبات الضرب مع لومي الرفيقة الطايرة"
        >
          <style>{cubeStyle}</style>
          <LumiAvatar model={model} />
          <GameBoard {...props} model={model} />
        </div>
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

export const cubeFlightSurface = (spec: RoomSpec, store: RoomStore) => new CubeSurface(spec, store);
