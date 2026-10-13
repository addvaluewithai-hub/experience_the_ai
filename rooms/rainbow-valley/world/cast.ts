import type { MouthFrame, PresenceMode } from '@experience/room-spec';

/** Who holds the floor, each character's mode and audible mouth: shared by the valley's worlds. */
export class Cast {
  speaker: string | null = null;
  private modes = new Map<string, PresenceMode>();
  private mouths = new Map<string, MouthFrame | null>();

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
}
