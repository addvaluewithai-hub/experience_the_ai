import { Cast } from '@experience/kit-phaser';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';

/** The original PixiLive sprite rig, mounted by the room's SVG avatar. */
export interface SpriteRig {
  setFlight(command: {
    action: 'move' | 'hover';
    x?: number;
    y?: number;
    speed?: number;
    path?: 'arc' | 'direct' | 'swoop';
  }): boolean;
  setGesture(name: string, duration?: number): void;
  setEmotion(name: string): void;
  setMouthPose(frame: MouthFrame | null): void;
  setMode?(mode: PresenceMode): void;
  setEnergy(value: number): void;
  destroy(): void;
}
type Spot = 'left' | 'middle' | 'right';
export type GameAction = 'hint' | 'array' | 'advance';
export type GameCommand = { id: number; action: GameAction };

/** Scoring stays in memory.ts; Lumi only moves and reacts. */
export class CubeModel extends Cast {
  question = '';
  phase = 'مستنيين أول سؤال';
  private avatar: SpriteRig | null = null;
  private place: Spot = 'middle';
  private successes = 0;
  private listeners = new Set<() => void>();
  private command: GameCommand | null = null;
  private commandId = 0;
  subscribeCommand = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getCommand = () => this.command;

  private request(action: GameAction) {
    this.command = { id: ++this.commandId, action };
    for (const listener of this.listeners) listener();
  }

  bindAvatar(avatar: SpriteRig | null) {
    this.avatar = avatar;
    if (!avatar) return;
    this.go(this.place);
    avatar.setMode?.(this.modeOf('lumi'));
    avatar.setEnergy(0.25);
    avatar.setMouthPose(this.mouthOf('lumi'));
  }

  go(spot: Spot) {
    this.place = spot;
    const x = spot === 'left' ? 0.16 : spot === 'right' ? 0.84 : 0.5;
    this.avatar?.setFlight({ action: 'move', x, y: 0.16, speed: 0.65, path: 'arc' });
  }

  prompt(a: number, b: number) {
    this.question = `${a} × ${b}`;
    this.phase = 'بتحاول تسترجع من الذاكرة';
    this.avatar?.setEmotion('happy');
    this.go('middle');
  }

  hint() {
    this.phase = 'بتستخدم تلميح';
    this.avatar?.setEmotion('thinking');
    this.avatar?.setGesture('think', 1.5);
    this.go('left');
  }

  answer(correct: boolean, helped: boolean) {
    this.phase = correct
      ? helped
        ? 'صح بمساعدة؛ هتجرّبها تاني'
        : 'إجابة صح مستقلة'
      : 'شافت الحل وهترجع للعملية بعد فاصل';
    if (correct) {
      this.successes++;
      this.avatar?.setEmotion('excited');
      this.avatar?.setGesture('celebrate', 1.5);
      this.go(this.successes % 2 ? 'right' : 'left');
    } else {
      this.avatar?.setEmotion('thinking');
      this.go('left');
    }
  }

  act(character: string, action: string, args: Record<string, unknown>) {
    if (character !== 'lumi') return;
    if (
      action === 'fly_to' &&
      (args.place === 'left' || args.place === 'middle' || args.place === 'right')
    )
      this.go(args.place);
    else if (action === 'show_hint') this.request('hint');
    else if (action === 'reveal_array') this.request('array');
    else if (action === 'advance') this.request('advance');
    else if (action === 'cheer') {
      this.avatar?.setEmotion('excited');
      this.avatar?.setGesture('celebrate', 1.5);
      this.go('right');
    }
  }

  setMode(character: string, mode: PresenceMode) {
    super.setMode(character, mode);
    if (character === 'lumi') {
      this.avatar?.setMode?.(mode);
      this.avatar?.setEnergy(mode === 'speaking' ? 0.45 : 0.2);
    }
  }

  speak(character: string | null) {
    super.speak(character);
    this.avatar?.setMode?.(character === 'lumi' ? 'speaking' : 'idle');
  }

  mouth(character: string, frame: MouthFrame | null) {
    super.mouth(character, frame);
    if (character === 'lumi') this.avatar?.setMouthPose(frame);
  }

  state() {
    return `Lumi is flying above number cubes. Game: ${this.question || 'not started'}; ${this.phase}. The keypad checks results exactly; do not guess correctness or say a hidden answer first.`;
  }
}
