import type { Positions, StageCommand } from './stage-agent';

/**
 * The contract between the brain (conversations, voice, memory, room logic) and any surface
 * that shows characters: an SVG stage, a Phaser world, a 3D place. The brain only calls
 * these; how a surface draws, moves and lip-syncs is its own business.
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
  /** A semantic stage command from a tool call or an authored sequence. */
  dispatch(command: StageCommand): void;
  /** One character holds the floor; the others listen and turn to it. null ends it. */
  speak(character: string | null): void;
  readonly speaking: string | null;
  setMode(character: string, mode: PresenceMode): void;
  /** Lip sync: the mouth for what is audible now; null returns to the surface's own mouth. */
  mouth(character: string, frame: MouthFrame | null): void;
  /** Where the cast is, for the stage brief a character reads. */
  positions(): Positions;
}
