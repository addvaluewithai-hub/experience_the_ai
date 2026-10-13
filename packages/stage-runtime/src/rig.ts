import type {
  Expression,
  Gesture,
  Locomotion,
  MouthFrame,
  Pose,
  PresenceMode,
} from '@experience/room-spec';
import { clamp, mix } from './project';
import { actionPose, FACES, REST_POSE, type Action, type Face } from './poses';
import { Spring } from './spring';

export type Mode = PresenceMode;
export type Spot = { x: number; depth: number; height: number };
/** What a rig needs to know about its stage, in stage terms only. */
export type World = {
  place(id: string): Spot | undefined;
  /** Seat height in body units when sitting at a place (a desk is high, a rug is the floor). */
  seat(placeId: string | null): number;
};
export type Step =
  | { kind: 'go'; place: string; how: Locomotion; speed: number }
  | { kind: 'pose'; pose: Pose }
  | { kind: 'act'; action: Action; seconds: number; expression?: Expression }
  | { kind: 'orbit'; seconds: number }
  | { kind: 'wait'; seconds: number };

export type RigFrame = {
  x: number;
  depth: number;
  height: number;
  at: string | null;
  facing: number;
  sit: number;
  seat: number;
  walk: number;
  bob: number;
  arms: { a: [number, number]; b: [number, number] };
  head: number;
  turn: number;
  face: Face;
  mouth: number;
  /** The audible viseme, when lips are driven by playback. */
  lips: string | null;
  blink: number;
  mode: Mode;
  moving: boolean;
};

const PACE: Record<Locomotion, number> = { walk: 0.22, run: 0.45, hop: 0.2, fly: 0.3 };
const ease = (t: number) => t * t * (3 - 2 * t);

/** One character's body on a stage: a step queue for travel and routines, plus springs. */
export class Rig {
  at: string | null;
  private pos: Spot;
  private travel: { from: Spot; to: Spot; how: Locomotion; p: number; rate: number } | null = null;
  private queue: Step[] = [];
  private current: { step: Step; started: number } | null = null;
  private time = 0;
  private walkPhase = 0;
  private mode: Mode = 'idle';
  private gesture: { action: Action; started: number; until: number } | null = null;
  private feeling: { face: Face; until: number } | null = null;
  private nextBlink = 2;
  private blinkAt = -1;
  private lookX: number | 'person' = 'person';
  /** Lip sync from audible playback; while fresh it replaces the text talk loop. */
  private lips: { frame: MouthFrame; at: number } | null = null;
  private sit = new Spring(0, 0, 6);
  private seat = new Spring(0, 0, 8);
  private facing: Spring;
  private turn = new Spring(0, 0, 7);
  private head = new Spring(0, 0, 9);
  private hop = new Spring(0, 0, 10);
  private arms = [0, 1, 2, 3].map(() => new Spring(10, 10, 11));
  private face = Object.fromEntries(
    Object.entries(FACES.neutral).map(([k, v]) => [k, new Spring(v, v, 9)]),
  ) as Record<keyof Face, Spring>;

  constructor(
    private world: World,
    start: { at: string; pose: Pose; facing: 'left' | 'right' },
    private energy = 0.5,
    private reduced = false,
  ) {
    this.at = start.at;
    this.pos = { ...(world.place(start.at) ?? { x: 0.5, depth: 0.5, height: 0 }) };
    this.facing = new Spring(start.facing === 'left' ? -1 : 1, start.facing === 'left' ? -1 : 1, 8);
    if (start.pose === 'sit') {
      this.seat.snap(world.seat(start.at));
      this.sit.snap(1);
    }
  }

  /** Replace what the character is doing with new steps (an interruption is an empty list). */
  play(steps: Step[]) {
    this.queue = [...steps];
    this.current = null;
  }
  perform(expression: Expression, gesture: Gesture, intensity: number, seconds: number) {
    const base = FACES.neutral;
    const face = Object.fromEntries(
      Object.entries(FACES[expression]).map(([k, v]) => [
        k,
        mix(base[k as keyof Face], v, intensity),
      ]),
    ) as Face;
    this.feeling = { face, until: this.time + seconds };
    if (gesture !== 'none')
      this.gesture = { action: gesture, started: this.time, until: this.time + seconds };
  }
  mouth(frame: MouthFrame | null) {
    this.lips = frame ? { frame, at: this.time } : null;
  }
  setMode(mode: Mode) {
    this.mode = mode;
  }
  /** Face a point across the stage, or the person in front of the screen. */
  lookAt(target: number | 'person') {
    this.lookX = target;
  }
  get busy() {
    return Boolean(this.current || this.queue.length);
  }
  get spot(): Spot {
    return { ...this.pos };
  }

  step(dt: number) {
    this.time += dt;
    this.advance(dt);
    const walking = this.travel && this.travel.how !== 'fly';
    const t = this.time;
    // Arms and head: the current action, else walking swing, else breathing at rest.
    const acting = this.currentAction();
    let pose = acting ? actionPose(acting.action, t - acting.started) : REST_POSE;
    if (!acting && walking) {
      const swing = 18 * Math.sin(this.walkPhase);
      pose = { ...REST_POSE, a: [10 + swing, -15], b: [10 - swing, -15] };
    }
    const breathe = this.reduced ? 0 : Math.sin(t * 1.6) * (1 + this.energy);
    const targets = [pose.a[0] + breathe, pose.a[1], pose.b[0] + breathe, pose.b[1]];
    this.arms.forEach((arm, i) => {
      arm.target = targets[i];
      arm.step(dt);
    });
    const talking = this.mode === 'speaking' && !this.reduced ? 3 * Math.sin(t * 5.3) : 0;
    this.head.target = pose.head + talking + (this.mode === 'listening' ? 4 : 0);
    this.hop.target = this.reduced ? 0 : pose.hop;
    this.head.step(dt);
    this.hop.step(dt);
    // Face: a performed feeling while it lasts, else what the mode suggests.
    const sleeping = acting?.action === 'sleep';
    const goal =
      this.feeling && this.feeling.until > t
        ? this.feeling.face
        : sleeping
          ? FACES.sleepy
          : this.mode === 'thinking'
            ? FACES.thinking
            : FACES.neutral;
    for (const [key, spring] of Object.entries(this.face) as [keyof Face, Spring][]) {
      spring.target = key === 'eye' && sleeping ? 0 : goal[key];
      spring.step(dt);
    }
    // Facing follows travel, else the look target.
    if (this.travel && Math.abs(this.travel.to.x - this.travel.from.x) > 0.01)
      this.facing.target = Math.sign(this.travel.to.x - this.travel.from.x);
    else if (this.lookX !== 'person' && Math.abs(this.lookX - this.pos.x) > 0.02)
      this.facing.target = Math.sign(this.lookX - this.pos.x);
    this.turn.target = this.lookX === 'person' || this.travel ? 0 : 0.6;
    this.facing.step(dt);
    this.turn.step(dt);
    this.sit.step(dt);
    this.seat.step(dt);
    if (t > this.nextBlink) {
      this.blinkAt = t;
      this.nextBlink = t + 2.4 + ((t * 7.3) % 2.6);
    }
  }

  frame(): RigFrame {
    const t = this.time;
    const blinkAge = t - this.blinkAt;
    const blink = blinkAge >= 0 && blinkAge < 0.14 ? 1 - Math.abs(blinkAge - 0.07) / 0.07 : 0;
    // Audible lips win (stale after 0.25 s); otherwise text talk shows as a loop.
    const lips = this.lips && t - this.lips.at < 0.25 ? this.lips.frame : null;
    const talk = lips
      ? lips.open
      : this.mode === 'speaking'
        ? 0.18 + 0.32 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 3.7))
        : 0;
    const walking = this.travel && this.travel.how !== 'fly';
    return {
      ...this.pos,
      at: this.at,
      facing: this.facing.value,
      sit: clamp(this.sit.value),
      seat: this.seat.value,
      walk: this.walkPhase,
      bob: this.reduced
        ? 0
        : (walking ? Math.abs(Math.sin(this.walkPhase)) * 3 : 0) +
          this.hop.value * 18 +
          Math.sin(t * 1.6) * 0.8,
      arms: {
        a: [this.arms[0].value, this.arms[1].value],
        b: [this.arms[2].value, this.arms[3].value],
      },
      head: this.head.value,
      turn: this.turn.value,
      face: Object.fromEntries(Object.entries(this.face).map(([k, s]) => [k, s.value])) as Face,
      mouth: Math.max(this.face.open.value, talk),
      lips: lips?.viseme ?? null,
      blink,
      mode: this.mode,
      moving: Boolean(this.travel),
    };
  }

  private currentAction() {
    const step = this.current?.step;
    if (step?.kind === 'act') return { action: step.action, started: this.current!.started };
    if (step?.kind === 'pose' && step.pose === 'stand' && this.sit.value > 0.5) return null;
    if (this.gesture && this.gesture.until > this.time) return this.gesture;
    return null;
  }

  private advance(dt: number) {
    if (!this.current && this.queue.length)
      this.current = { step: this.queue.shift()!, started: this.time };
    const current = this.current;
    if (!current) return;
    const { step } = current;
    const elapsed = this.time - current.started;
    const done = () => (this.current = null);
    if (step.kind === 'go') {
      if (this.sit.value > 0.15) return void (this.sit.target = 0);
      const to = this.world.place(step.place);
      if (!to) return done();
      if (!this.travel) {
        const from = { ...this.pos };
        const distance = Math.hypot(
          (to.x - from.x) * 1.6,
          to.depth - from.depth,
          (to.height - from.height) * 1.2,
        );
        if (distance < 0.005) {
          this.at = step.place;
          return done();
        }
        const pace =
          PACE[step.how] * (0.5 + step.speed) * (0.7 + this.energy * 0.6) * (this.reduced ? 2 : 1);
        this.travel = { from, to, how: step.how, p: 0, rate: pace / distance };
        this.at = null;
      }
      const trip = this.travel;
      trip.p = Math.min(1, trip.p + dt * trip.rate);
      const e = ease(trip.p);
      const arc =
        trip.how === 'fly'
          ? Math.sin(Math.PI * e) * 0.15
          : trip.how === 'hop'
            ? Math.abs(Math.sin(Math.PI * trip.p * 4)) * 0.05
            : 0;
      this.pos = {
        x: mix(trip.from.x, trip.to.x, e),
        depth: mix(trip.from.depth, trip.to.depth, e),
        height: mix(trip.from.height, trip.to.height, e) + arc,
      };
      this.walkPhase += dt * trip.rate * 40 * (trip.how === 'run' ? 1.4 : 1);
      if (trip.p >= 1) {
        this.pos = { ...trip.to };
        this.travel = null;
        this.at = step.place;
        done();
      }
    } else if (step.kind === 'pose') {
      this.seat.target = this.world.seat(this.at);
      this.sit.target = step.pose === 'sit' ? 1 : 0;
      if (Math.abs(this.sit.value - this.sit.target) < 0.05) done();
    } else if (step.kind === 'act') {
      if (step.expression) this.perform(step.expression, 'none', 0.85, step.seconds);
      if (elapsed >= step.seconds) done();
    } else if (step.kind === 'orbit') {
      const center = this.world.place(this.at ?? '') ?? this.pos;
      const a = elapsed * 1.8;
      this.pos = {
        x: center.x + Math.cos(a) * 0.09,
        depth: center.depth,
        height: Math.max(0.15, center.height) + Math.sin(a) * 0.06,
      };
      if (elapsed >= step.seconds) {
        this.pos = { ...center, height: Math.max(0.15, center.height) };
        done();
      }
    } else if (elapsed >= step.seconds) done();
  }
}
