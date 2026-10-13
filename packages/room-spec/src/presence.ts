/**
 * The contract between the brain (conversations, voice, memory, room logic) and a room's
 * surface, whatever draws it: a Phaser world, a 3D place, an SVG stage, a dashboard. The brain
 * only calls these; what an action looks like is the surface's own business.
 */
export const VISEMES = [
  'REST',
  'MBP',
  'AA',
  'EE',
  'IH',
  'OH',
  'OO',
  'FV',
  'L',
  'S',
  'CH',
  'WQ',
] as const;
export type Viseme = (typeof VISEMES)[number];

/** One mouth sample, taken from audible playback (never from text or a timer). */
export type MouthFrame = {
  viseme: Viseme;
  open: number;
  energy: number;
  width?: number;
  round?: number;
};

export type PresenceMode = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface Presence {
  /** A world action the room declared, already checked against its params. */
  act(character: string, action: string, args: Record<string, unknown>): void;
  /** One character holds the floor; the others may listen and turn to it. null ends it. */
  speak(character: string | null): void;
  readonly speaking: string | null;
  setMode(character: string, mode: PresenceMode): void;
  /** Lip sync: the mouth for what is audible now; null returns to the surface's own mouth. */
  mouth(character: string, frame: MouthFrame | null): void;
  /** The world now, in a few words for the characters' brief (who is where, what changed). */
  state(): string;
}
