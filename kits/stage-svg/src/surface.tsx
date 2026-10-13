import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomEntry, RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { StageController } from './controller';
import { StageView } from './StageView';
import { stageState, stageWorld, toCommand } from './world/agent';
import { parseStage, type Stage } from './world/stage';

const prefersLessMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The SVG stage as a room surface: the engine's Presence calls become rig commands. */
export class StageSurface implements RoomSurface {
  readonly controller: StageController;
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    private spec: RoomSpec,
    private store: RoomStore,
    stage: Stage,
    options: { reducedMotion?: boolean } = {},
  ) {
    const controller = new StageController(stage, {
      reducedMotion: options.reducedMotion ?? prefersLessMotion(),
    });
    this.controller = controller;
    this.View = function StageSurfaceView(props: SurfaceViewProps) {
      return (
        <StageView
          spec={props.spec}
          controller={controller}
          data={props.data}
          title={props.spec.title}
        />
      );
    };
  }

  act(character: string, action: string, args: Record<string, unknown>) {
    const command = toCommand(this.controller.stage, character, action, args);
    if (command) this.controller.dispatch(command);
  }
  speak(character: string | null) {
    this.controller.speak(character);
  }
  get speaking() {
    return this.controller.speaking;
  }
  setMode(character: string, mode: PresenceMode) {
    this.controller.setMode(character, mode);
  }
  mouth(character: string, frame: MouthFrame | null) {
    this.controller.mouth(character, frame);
  }
  state() {
    return stageState(
      this.controller.stage,
      this.spec.characters,
      this.controller.positions(),
      this.store.get(),
    );
  }
}

type RawRoom = {
  characters: { id: string }[];
  collections: { id: string; fields: { id: string; type: string }[] }[];
};

/**
 * Puts a room on this stage: checks the stage config against the room, declares the stage's
 * world in the room's spec, and gives the room its surface.
 */
export function stageRoom<R extends RawRoom>(room: R, config: unknown): RoomEntry {
  const stage = parseStage(room, config);
  return {
    spec: { ...room, world: stageWorld(stage) },
    surface: (spec, store) => new StageSurface(spec, store, stage),
  };
}
