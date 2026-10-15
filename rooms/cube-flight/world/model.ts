import { Flight, Wings, type FlightState, type WingFrame } from '@experience/kit-flight';
import { Cast } from '@experience/kit-phaser';

type Spot = 'left' | 'middle' | 'right';
type Moment = 'cheer' | 'think';

/** Presence + playful motion. Scores never enter this class: the game logic owns them. */
export class CubeModel extends Cast {
  readonly flight: Flight;
  private wings: Wings;
  wing: WingFrame = { phase: 0, beat: 0, open: 0 };
  question = '';
  phase = 'مستنيين أول سؤال';
  private momentQueue: Moment[] = [];
  private successes = 0;

  constructor(readonly reduced = false) {
    super();
    this.flight = new Flight({ x: 0.5, y: 0.24 }, { reducedMotion: reduced });
    this.wings = new Wings({ reducedMotion: reduced });
  }

  step(dt: number): FlightState {
    const next = this.flight.step(dt);
    this.wing = this.wings.step(dt, next);
    return next;
  }

  prompt(a: number, b: number) {
    this.question = `${a} × ${b}`;
    this.phase = 'بتحاول تسترجع من الذاكرة';
    this.go('middle');
  }

  hint() {
    this.phase = 'بتستخدم تلميح';
    this.momentQueue.push('think');
    this.go('left');
  }

  answer(correct: boolean, helped: boolean) {
    this.phase = correct
      ? helped
        ? 'صح بمساعدة؛ هتجرّبها تاني'
        : 'إجابة صح مستقلة'
      : 'شافت الحل وهترجع للعملية بعد فاصل';
    if (correct) {
      this.successes += 1;
      this.momentQueue.push('cheer');
      this.go(this.successes % 2 ? 'right' : 'left');
    } else {
      this.momentQueue.push('think');
      this.go('left');
    }
  }

  go(spot: Spot) {
    const x = spot === 'left' ? 0.21 : spot === 'right' ? 0.79 : 0.5;
    this.flight.command({ action: 'move', x, y: 0.24, speed: 0.7, path: 'arc' });
  }

  takeMoments() {
    return this.momentQueue.splice(0);
  }

  act(character: string, action: string, args: Record<string, unknown>) {
    if (character !== 'zuzu') return;
    if (
      action === 'fly_to' &&
      (args.place === 'left' || args.place === 'middle' || args.place === 'right')
    ) {
      this.go(args.place);
    } else if (action === 'cheer') {
      this.momentQueue.push('cheer');
      this.go('right');
    }
  }

  state() {
    return `Zuzu is flying above number cubes. Current game: ${this.question || 'not started'}; ${this.phase}. The keypad checks multiplication exactly; do not guess whether an answer was correct and do not reveal the result unless asked. Voice is optional.`;
  }
}
