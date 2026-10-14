import { Cast } from '@experience/kit-phaser';
import type { Character, RoomData } from '@experience/room-spec';
import { describeDay } from './day';
import { isSpot, lightOf, SPOTS, type Spot } from './layout';
import type { Gesture } from './noor';

export type Note = 'habits' | 'week' | 'shopping';
export type SceneRequest = { id: string; done: () => void };
const GESTURES: Gesture[] = ['wave', 'point', 'cheer', 'think', 'nod'];
const WALK = 230;

/**
 * The kitchen's living state, outside Phaser and React: where Noor stands and what she does,
 * which note is open on the fridge, whether the chalkboard is lit. Both views read it.
 */
export class KitchenModel extends Cast {
  x: number = SPOTS.window.x;
  facing: 1 | -1 = 1;
  walking = 0;
  gesture: Gesture | null = null;
  note: Note | null = null;
  boardLit = false;
  private target: number = SPOTS.window.x;
  private gestureLeft = 0;
  private litLeft = 0;
  private scenes: SceneRequest[] = [];
  private listeners = new Set<() => void>();

  constructor(
    readonly options: {
      reducedMotion?: boolean;
      data?: () => RoomData;
      now?: () => Date;
    } = {},
  ) {
    super();
  }

  now() {
    return this.options.now?.() ?? new Date();
  }
  spot(): Spot | null {
    const here = Object.entries(SPOTS).find(([, s]) => Math.abs(s.x - this.x) < 12);
    return here ? (here[0] as Spot) : null;
  }

  /** A world action Noor took, already checked by the engine. */
  act(_character: string, action: string, args: Record<string, unknown>) {
    if (action === 'go_to' && isSpot(args.place)) this.walkTo(args.place);
    else if (action === 'gesture' && GESTURES.includes(args.kind as Gesture))
      this.perform(args.kind as Gesture);
    else if (action === 'show') this.show(String(args.thing));
    else if (action === 'play_scene' && typeof args.scene === 'string') void this.play(args.scene);
  }

  walkTo(spot: Spot) {
    this.target = SPOTS[spot].x;
  }
  perform(gesture: Gesture, seconds = 2.4) {
    this.gesture = gesture;
    this.gestureLeft = seconds;
  }

  /** Shows a part of the kitchen: she walks to it and points; a fridge note opens. */
  show(thing: string) {
    if (thing === 'habits') {
      this.walkTo('chalkboard');
      this.boardLit = true;
      this.litLeft = 3;
    } else if (thing === 'week' || thing === 'shopping') {
      this.walkTo('fridge');
      this.open(thing);
    } else return;
    this.perform('point', 3);
  }
  open(note: Note | null) {
    this.note = note;
    this.changed();
  }

  step(dt: number) {
    const gap = this.target - this.x;
    const move =
      Math.sign(gap) * Math.min(Math.abs(gap), WALK * dt * (this.options.reducedMotion ? 0.7 : 1));
    this.x += move;
    this.walking += ((Math.abs(gap) > 1 ? 1 : 0) - this.walking) * Math.min(1, dt * 8);
    if (Math.abs(gap) > 1) this.facing = gap > 0 ? 1 : -1;
    if (this.gestureLeft > 0 && (this.gestureLeft -= dt) <= 0) this.gesture = null;
    if (this.litLeft > 0 && (this.litLeft -= dt) <= 0) {
      this.boardLit = false;
      this.changed();
    }
  }

  play(id: string): Promise<void> {
    return new Promise((done) => this.scenes.push({ id, done }));
  }
  takeScenes() {
    return this.scenes.splice(0);
  }

  /** The interface (notes, chalkboard) listens here for what Noor opens or lights. */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private changed() {
    for (const listener of this.listeners) listener();
  }

  state(characters: Character[]): string {
    const name = characters.find((c) => c.id === 'noor')?.name ?? 'Noor';
    const spot = this.spot();
    const where = spot ? `at ${SPOTS[spot].label} (${spot})` : 'walking across the kitchen';
    const doing = this.gesture ? `, ${this.gesture}` : '';
    const opened = {
      habits: "today's habits board",
      week: 'week plan note',
      shopping: 'shopping note',
    };
    const open = this.note ? ` The ${opened[this.note]} is open big.` : '';
    const now = this.now();
    const light = lightOf(now.getHours());
    return `noor (${name}) ${where}${doing}. It is ${light} in the kitchen${light === 'night' ? '; the kitchen is closed' : ''}.${open} ${describeDay(this.options.data?.() ?? {}, now)}`;
  }
}
