import { Flight, Wings, type WingFrame } from '@experience/kit-flight';
import type { Character, RoomData } from '@experience/room-spec';
import { Cast } from '@experience/kit-phaser';
import type { SceneRequest } from '../../../world/model';

/** The three crystals, left to right, each woken by one time of day (the `when` choice). */
export const CRYSTALS = [
  { id: 'morning-crystal', label: 'كريستالة الصبح', when: 'الصبح', x: 0.2, color: 0x7dd3fc },
  { id: 'noon-crystal', label: 'كريستالة الضهر', when: 'الضهر', x: 0.5, color: 0xfde68a },
  { id: 'night-crystal', label: 'كريستالة الليل', when: 'بالليل', x: 0.8, color: 0xc4b5fd },
] as const;
export type CrystalId = (typeof CRYSTALS)[number]['id'];

/** Places in the river's flight box (x 0 left → 1 right, y 0 sky → 1 the water's edge). */
export const RIVER_PLACES: Record<string, { label: string; x: number; y: number }> = {
  ...Object.fromEntries(CRYSTALS.map((c) => [c.id, { label: c.label, x: c.x, y: 0.5 }])),
  water: { label: 'فوق المية', x: 0.5, y: 0.85 },
  'near-laila': { label: 'قدام ليلى', x: 0.5, y: 0.35 },
};

/** Today in the person's own time zone, as the `day` field stores it. */
export function localDay(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The crystals woken today: one per time of day, however often it was told. */
export function awakeToday(river: RoomData | undefined, today = localDay()): Set<CrystalId> {
  const times = new Set(
    (river?.brushes ?? []).filter((r) => r.values.day === today).map((r) => r.values.when),
  );
  return new Set(CRYSTALS.filter((c) => times.has(c.when)).map((c) => c.id));
}

export type RiverMoment = { kind: 'sparkle'; big: boolean; at?: CrystalId };

/**
 * The crystal river's living state, outside Phaser: the crystals awake today (from the
 * room's data), where the unicorn flies, who speaks. The scene reads it every frame.
 */
export class RiverModel extends Cast {
  readonly flight: Flight;
  private wings: Wings;
  private scenes: SceneRequest[] = [];
  private moments: RiverMoment[] = [];
  private seen: Set<CrystalId> | null = null;
  private heading = '';
  wing: WingFrame = { phase: 0, beat: 0, open: 1 };

  constructor(
    readonly options: {
      reducedMotion?: boolean;
      data?: () => RoomData | undefined;
      name?: () => string | null;
      today?: () => string;
    } = {},
  ) {
    super();
    this.flight = new Flight({ x: 0.04, y: 0.3 }, options);
    this.wings = new Wings(options);
  }

  awake(): Set<CrystalId> {
    return awakeToday(this.options.data?.(), this.options.today?.());
  }

  act(character: string, action: string, args: Record<string, unknown>) {
    if (action === 'play_scene' && typeof args.scene === 'string') {
      void this.play(args.scene);
    } else if (action === 'fly_to' && typeof args.place === 'string') {
      this.go(args.place, typeof args.speed === 'number' ? args.speed : 0.5);
    } else if (action === 'sparkle') {
      this.moment({ kind: 'sparkle', big: args.big === true });
    }
  }

  go(place: string, speed = 0.5) {
    const to = RIVER_PLACES[place];
    if (!to) return;
    if (this.flight.command({ action: 'move', x: to.x, y: to.y, speed, path: 'arc' }))
      this.heading = `flying to ${to.label} (${place})`;
  }

  /** Advances the flight; a crystal that has just woken calls the unicorn to it. */
  step(dt: number) {
    const s = this.flight.step(dt);
    this.wing = this.wings.step(dt, s);
    const awake = this.awake();
    if (this.seen)
      for (const id of awake)
        if (!this.seen.has(id)) {
          this.go(id, 0.7);
          this.moment({ kind: 'sparkle', big: awake.size === 3, at: id });
        }
    this.seen = awake;
    return s;
  }

  play(id: string): Promise<void> {
    return new Promise((done) => this.scenes.push({ id, done }));
  }
  takeScenes() {
    return this.scenes.splice(0);
  }
  private moment(moment: RiverMoment) {
    this.moments = [...this.moments, moment].slice(-4);
  }
  takeMoments() {
    return this.moments.splice(0);
  }

  state(characters: Character[]): string {
    const s = this.flight.state();
    const name = this.options.name?.();
    const who = `unicorn (${characters.find((c) => c.id === 'unicorn')?.name ?? 'unicorn'}${name ? `, named "${name}" by Laila` : ''})`;
    const here = Object.entries(RIVER_PLACES).find(
      ([, p]) => Math.hypot(p.x - s.x, p.y - s.y) < 0.06,
    );
    const where = s.moving
      ? this.heading || 'flying in'
      : here
        ? `hovering at ${here[1].label} (${here[0]})`
        : 'hovering over the river';
    const awake = this.awake();
    const crystals = CRYSTALS.map((c) => `${c.id} ${awake.has(c.id) ? 'awake' : 'asleep'}`);
    const speaker = characters.find((c) => c.id === this.speaker)?.name;
    const speaking = speaker ? `; ${speaker} is speaking` : '';
    return `${who} ${where}${speaking}. Crystals today: ${crystals.join(', ')} (${awake.size} of 3).${awake.size === 3 ? ' The whole river shines in rainbow colours.' : ''}`;
  }
}
