import { Flight, Wings, type FlightPath, type WingFrame } from '@experience/kit-flight';
import type { Character, MouthFrame, PresenceMode, RoomData } from '@experience/room-spec';
import { isPlace, PLACES, placeAt } from './places';

/** One-off moments the scene plays once: a sparkle burst, the stars twinkling. */
export type ValleyMoment =
  | { kind: 'sparkle'; big: boolean }
  | { kind: 'twinkle' }
  | { kind: 'wake' };
/** A scene asked of the director; `done` when the camera has played it. */
export type SceneRequest = { id: string; done: () => void };
/** The memory kind under which Laila's name for the unicorn is kept. */
export const NAME_KIND = 'اسم اليونيكورن';
const PATHS: FlightPath[] = ['direct', 'arc', 'swoop'];

/**
 * The valley's living state, outside Phaser: where the unicorn flies, who speaks, which
 * mouth is audible. The scene only reads it every frame; the conversation only writes it.
 */
export class ValleyModel {
  readonly flight: Flight;
  private readonly wings: Wings;
  /** What the unicorn is doing while it moves, in words. */
  private heading = '';
  private moments: ValleyMoment[] = [];
  private modes = new Map<string, PresenceMode>();
  private mouths = new Map<string, MouthFrame | null>();
  private scenes: SceneRequest[] = [];
  speaker: string | null = null;
  wing: WingFrame = { phase: 0, beat: 0, open: 0 };
  /** The unicorn sleeps on the meadow until someone begins; the valley is waiting. */
  asleep = true;

  constructor(
    readonly options: { reducedMotion?: boolean; memory?: () => RoomData | undefined } = {},
  ) {
    const home = PLACES.meadow;
    this.flight = new Flight({ x: home.x, y: home.y }, options);
    this.wings = new Wings(options);
  }

  /** A world action the room declared and the engine already checked. */
  act(character: string, action: string, args: Record<string, unknown>) {
    if (action === 'play_scene' && typeof args.scene === 'string') {
      void this.play(args.scene);
      return;
    }
    if (character === 'moon-granny') {
      if (action === 'twinkle_stars') this.moment({ kind: 'twinkle' });
      return;
    }
    if (character !== 'unicorn') return;
    this.wake();
    const speed = typeof args.speed === 'number' ? args.speed : 0.5;
    if (action === 'fly_to' && isPlace(args.place)) {
      const place = PLACES[args.place];
      const path = PATHS.find((p) => p === args.path) ?? 'arc';
      const accepted = this.flight.command(
        place.ground
          ? { action: 'land', x: place.x, speed, path }
          : { action: 'move', x: place.x, y: place.y, speed, path },
      );
      if (accepted) this.heading = `flying to ${place.label} (${args.place})`;
    } else if (action === 'land') {
      this.heading = 'gliding down to the grass';
      this.flight.command({ action: 'land', x: this.flight.state().x, speed, path: 'direct' });
    } else if (action === 'hover') {
      this.heading = 'slowing to a hover';
      this.flight.command({ action: 'hover' });
    } else if (action === 'sparkle') {
      this.moment({ kind: 'sparkle', big: args.big === true });
    }
  }

  step(dt: number) {
    const s = this.flight.step(dt);
    this.wing = this.wings.step(dt, s);
    return s;
  }

  private moment(moment: ValleyMoment) {
    // Only the latest few wait while the valley is off screen.
    this.moments = [...this.moments, moment].slice(-3);
  }

  /** Moments waiting to be played; reading them hands them to the scene. */
  takeMoments(): ValleyMoment[] {
    return this.moments.splice(0);
  }

  speak(character: string | null) {
    this.speaker = character;
    if (character === 'unicorn') this.wake();
  }

  /** Her first words wake her: a stretch of sparkles, then she flies close to Laila. */
  wake() {
    if (!this.asleep) return;
    this.asleep = false;
    this.moment({ kind: 'wake' });
    const near = PLACES['near-laila'];
    this.flight.command({ action: 'move', x: near.x, y: near.y, speed: 0.45, path: 'arc' });
    this.heading = `waking up and flying to ${near.label} (near-laila)`;
  }

  /** The name Laila gave the unicorn, from the valley's memories; null until she chooses. */
  nameOf(): string | null {
    const memories = this.options.memory?.()?.memories ?? [];
    const named = memories.filter((r) => r.values.kind === NAME_KIND).at(-1)?.values.fact;
    return typeof named === 'string' && named.trim() ? named.trim().slice(0, 16) : null;
  }

  /** Asks the director for a scene; resolves when it has played. */
  play(id: string): Promise<void> {
    return new Promise((done) => this.scenes.push({ id, done }));
  }
  takeScenes(): SceneRequest[] {
    return this.scenes.splice(0);
  }
  setMode(character: string, mode: PresenceMode) {
    this.modes.set(character, mode);
  }
  modeOf(character: string): PresenceMode {
    if (this.speaker === character) return 'speaking';
    return this.modes.get(character) ?? (this.speaker ? 'listening' : 'idle');
  }
  mouth(character: string, frame: MouthFrame | null) {
    this.mouths.set(character, frame);
  }
  mouthOf(character: string) {
    return this.mouths.get(character) ?? null;
  }

  /** The valley now, in words, for the characters to read before they speak. */
  state(characters: Character[]): string {
    const s = this.flight.state();
    const name = (id: string) => characters.find((c) => c.id === id)?.name ?? id;
    const here = placeAt(s.x, s.y);
    const named = this.nameOf();
    const who = named
      ? `unicorn (${name('unicorn')}, named "${named}" by Laila)`
      : `unicorn (${name('unicorn')}, no name yet: Laila has not chosen one)`;
    const where = this.asleep
      ? 'asleep on the grass at المرج (meadow); she wakes with the first words'
      : s.moving
        ? this.heading
        : here
          ? `${s.landed ? 'resting on the grass at' : 'hovering at'} ${PLACES[here].label} (${here})`
          : 'hovering between places';
    const speaking = this.speaker ? `; ${name(this.speaker)} is speaking` : '';
    return `${who} ${where}; moon-granny (${name('moon-granny')}) in the sky${speaking}. The valley's colours are still asleep.`;
  }
}
