import {
  parseData,
  type MouthFrame,
  type PresenceMode,
  type RoomSpec,
} from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import { useEffect, useState, type ComponentType } from 'react';
import { LumiAvatar } from './avatar';
import { GameBoard } from './board';
import { CubeModel } from './model';
import { cubeStyle } from './style';
import { missionStyle } from './mission-style';

/** Reuses PixiLive's own SVG art and motion rig; no duplicate Phaser mascot. */
export class CubeSurface implements RoomSurface {
  readonly model = new CubeModel();
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    readonly spec: RoomSpec,
    store: RoomStore,
  ) {
    // Preview-only browser persistence for this room, validated before it enters the store.
    // Names and progress stay on this device; no third-party analytics or server profiles.
    if (typeof localStorage !== 'undefined') {
      const key = 'experience_the_ai:cube-flight:facts:v1';
      try {
        const cached = localStorage.getItem(key);
        if (cached) store.set(parseData(spec, JSON.parse(cached)));
      } catch {
        // Private browsing / corrupted cache: safely start with an empty room store.
      }
      store.subscribe(() => {
        try {
          localStorage.setItem(key, JSON.stringify(store.get()));
        } catch {
          // The room still works when browser storage is blocked.
        }
      });
    }
    const model = this.model;
    this.View = function CubeView(props: SurfaceViewProps) {
      const [avatarReady, setAvatarReady] = useState(false);
      // The original PixiLive rig attaches after the game board's initial React commit.
      // This avoids competing with the board on the first StrictMode mount.
      useEffect(() => {
        const frame = requestAnimationFrame(() => setAvatarReady(true));
        return () => cancelAnimationFrame(frame);
      }, []);
      return (
        <div
          className="cf-stage"
          data-world="cube-flight"
          role="group"
          aria-label="لعبة مكعبات الضرب مع لومي الرفيقة الطايرة"
        >
          <style>{cubeStyle + missionStyle}</style>
          {avatarReady && <LumiAvatar model={model} />}
          <GameBoard {...props} model={model} />
        </div>
      );
    };
  }

  onGameEvent(listener: (event: import('@experience/room-runtime').RoomInteractionEvent) => void) {
    return this.model.subscribeGame(listener);
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
