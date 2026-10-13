import { Flight, Wings, type FlightPath, type WingFrame } from '@experience/kit-flight';
import type { Character, MouthFrame, PresenceMode } from '@experience/room-spec';
import { isPlace, PLACES, placeAt } from './places';

/** One-off moments the scene plays once: a sparkle burst, the stars twinkling. */
export type ValleyMoment = { kind: 'sparkle'; big: boolean } | { kind: 'twinkle' };
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
  speaker: string | null = null;
  wing: WingFrame = { phase: 0, beat: 0, open: 0 };

  constructor(readonly options: { reducedMotion?: boolean } = {}) {
    const home = PLACES.meadow;
    this.flight = new Flight({ x: home.x, y: home.y }, options);
    this.wings = new Wings(options);
  }

  /** A world action the room declared and the engine already checked. */
  act(character: string, action: string, args: Record<string, unknown>) {
    if (character === 'moon-granny') {
      if (action === 'twinkle_stars') this.moment({ kind: 'twinkle' });
      return;
    }
    if (character !== 'unicorn') return;
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
    const where = s.moving
      ? this.heading
      : here
        ? `${s.landed ? 'resting on the grass at' : 'hovering at'} ${PLACES[here].label} (${here})`
        : 'hovering between places';
    const speaking = this.speaker ? `; ${name(this.speaker)} is speaking` : '';
    return `unicorn (${name('unicorn')}) ${where}; moon-granny (${name('moon-granny')}) in the sky${speaking}. The valley's colours are still asleep.`;
  }
}
