import {
  capabilitiesOf,
  type MouthFrame,
  type Presence,
  PROPS,
  stageOf,
  type Positions,
  type RoomSpec,
  type Stage,
  type StageCommand,
} from '@experience/room-spec';
import { Rig, type Mode, type RigFrame, type World } from './rig';
import { routineSteps } from './routines';

/** Seat heights in body units (an adult is about 190 tall). */
const SEATS = { top: 72, seat: 42, floor: 4 } as const;

/**
 * Owns every rig on one stage. It lives outside React, so commands from a conversation reach
 * the stage whether or not its page is on screen; a view only reads frames.
 */
export class StageController implements Presence {
  readonly stage: Stage;
  private rigs = new Map<string, Rig>();
  private speaker: string | null = null;
  readonly world: World;

  constructor(
    private spec: RoomSpec,
    options: { reducedMotion?: boolean } = {},
  ) {
    const stage = stageOf(spec);
    if (!stage) throw new Error('This room has no stage');
    this.stage = stage;
    this.world = {
      place: (id) => {
        const air = id.startsWith('@air:');
        const place = stage.places.find((p) => p.id === (air ? id.slice(5) : id));
        if (!place) return undefined;
        const height = place.height ?? 0;
        return {
          x: place.x,
          depth: place.depth,
          height: air ? Math.max(0.45, height + 0.3) : height,
        };
      },
      seat: (placeId) => {
        const kind = stage.props
          .filter((p) => p.at === placeId)
          .map((p) => (PROPS[p.prop] as { seat?: keyof typeof SEATS }).seat)
          .find(Boolean);
        return SEATS[kind ?? 'floor'];
      },
    };
    for (const member of stage.cast) {
      const look = spec.characters.find((c) => c.id === member.character)?.look;
      if (look)
        this.rigs.set(
          member.character,
          new Rig(this.world, member, look.energy, options.reducedMotion),
        );
    }
  }

  get cast() {
    return [...this.rigs.keys()];
  }

  dispatch(command: StageCommand) {
    const rig = this.rigs.get(command.character);
    const character = this.spec.characters.find((c) => c.id === command.character);
    if (!rig || !character?.look) return;
    const canFly = capabilitiesOf(character.look).locomotion.includes('fly');
    switch (command.type) {
      case 'go':
        return rig.play([
          { kind: 'go', place: command.place, how: command.how, speed: command.speed },
        ]);
      case 'route': {
        const route = this.stage.routes.find((r) => r.id === command.route);
        const flying =
          canFly && route?.through.some((id) => (this.world.place(id)?.height ?? 0) > 0);
        return rig.play(
          (route?.through ?? []).flatMap((place) => [
            {
              kind: 'go' as const,
              place,
              how: flying ? ('fly' as const) : ('walk' as const),
              speed: command.speed,
            },
            { kind: 'wait' as const, seconds: 0.8 },
          ]),
        );
      }
      case 'routine':
        return rig.play(routineSteps(command.routine, command.at, canFly));
      case 'pose':
        return rig.play([{ kind: 'pose', pose: command.pose }]);
      case 'look':
        return rig.lookAt(this.targetX(command.target));
      case 'perform':
        return rig.perform(
          command.expression,
          command.gesture,
          command.intensity,
          command.duration,
        );
    }
  }

  setMode(character: string, mode: Mode) {
    this.rigs.get(character)?.setMode(mode);
  }

  /** One character speaks: the others listen and turn to them. null ends it. */
  speak(character: string | null) {
    this.speaker = character;
    for (const [id, rig] of this.rigs) {
      if (id === character) {
        rig.setMode('speaking');
        rig.lookAt('person');
      } else {
        rig.setMode(character ? 'listening' : 'idle');
        rig.lookAt(character ? this.targetX(character) : 'person');
      }
    }
  }

  mouth(character: string, frame: MouthFrame | null) {
    this.rigs.get(character)?.mouth(frame);
  }

  get speaking() {
    return this.speaker;
  }

  step(dt: number) {
    const capped = Math.min(dt, 0.1);
    for (const rig of this.rigs.values()) rig.step(capped);
  }

  frames(): Map<string, RigFrame> {
    return new Map([...this.rigs].map(([id, rig]) => [id, rig.frame()]));
  }

  /** Where everyone is, for the stage brief a character reads. */
  positions(): Positions {
    return Object.fromEntries(
      [...this.rigs].map(([id, rig]) => [
        id,
        { at: rig.at, pose: rig.frame().sit > 0.5 ? 'sit' : 'stand' },
      ]),
    );
  }

  private targetX(target: string): number | 'person' {
    if (target === 'person') return 'person';
    const rig = this.rigs.get(target);
    if (rig) return rig.spot.x;
    return this.world.place(target)?.x ?? 'person';
  }
}
