import { Cast } from '@experience/kit-phaser';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';

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
export type GameEvent = {
  kind: 'start' | 'teach' | 'lesson_complete' | 'question' | 'selection' | 'pause' | 'answer' | 'hint' | 'round_complete';
  detail: Record<string, string | number | boolean>;
};
export type PlayerProfile = { player: string; companion: string };
const PROFILE_KEY = 'experience_the_ai:cube-flight:profile:v1';
const cleanName = (value: unknown) =>
  typeof value === 'string'
    ? value
        .trim()
        .replace(/[<>\u0000-\u001f]/g, '')
        .slice(0, 24)
    : '';

function readProfile(): PlayerProfile {
  try {
    if (typeof localStorage === 'undefined') return { player: '', companion: 'لومي' };
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') as Record<string, unknown>;
    return { player: cleanName(saved.player), companion: cleanName(saved.companion) || 'لومي' };
  } catch {
    return { player: '', companion: 'لومي' };
  }
}

/** Deterministic game decisions live in the board; Lumi can observe events and request only safe actions. */
export class CubeModel extends Cast {
  question = '';
  phase = 'مستنيين أول سؤال';
  private avatar: SpriteRig | null = null;
  private place: Spot = 'middle';
  private successes = 0;
  private listeners = new Set<() => void>();
  private gameListeners = new Set<(event: GameEvent) => void>();
  private profileListeners = new Set<() => void>();
  private command: GameCommand | null = null;
  private commandId = 0;
  private profile: PlayerProfile | null = null;

  subscribeCommand = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getCommand = () => this.command;
  subscribeGame = (listener: (event: GameEvent) => void) => {
    this.gameListeners.add(listener);
    return () => {
      this.gameListeners.delete(listener);
    };
  };
  emit(event: GameEvent) {
    for (const listener of this.gameListeners) listener(event);
  }
  getProfile = (): PlayerProfile => (this.profile ??= readProfile());
  subscribeProfile = (listener: () => void) => {
    this.profileListeners.add(listener);
    return () => {
      this.profileListeners.delete(listener);
    };
  };
  remember(which: 'player' | 'companion', name: unknown): boolean {
    const value = cleanName(name);
    if (value.length < 2) return false;
    const next = { ...this.getProfile(), [which]: value };
    this.profile = next;
    for (const listener of this.profileListeners) listener();
    try {
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: still remember it for this tab.
    }
    this.emit({ kind: 'selection', detail: { identity: which, name: value } });
    return true;
  }

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
  peek() {
    this.avatar?.setEmotion('curious');
    this.avatar?.setGesture('think', 0.6);
  }
  hint() {
    this.phase = 'بتستخدم تلميح';
    this.avatar?.setEmotion('thinking');
    this.avatar?.setGesture('think', 1.5);
    this.go('left');
  }
  answer(correct: boolean, helped: boolean) {
    this.phase = correct ? (helped ? 'صح بمساعدة' : 'صح من الذاكرة') : 'لسه بتتعلم وبتحاول';
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
    else if (action === 'remember_player') this.remember('player', args.nickname);
    else if (action === 'name_companion') this.remember('companion', args.nickname);
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
    const profile = this.getProfile();
    return `Cube Flight game. Question: ${this.question || 'not started'}. Phase: ${this.phase}. Player's chosen nickname: ${profile.player || 'not supplied yet'}. Flying companion's chosen name: ${profile.companion}. Local browser profile only. Numeric answers are evaluated solely by code. Use tools for visual help, not scoring.`;
  }
}
