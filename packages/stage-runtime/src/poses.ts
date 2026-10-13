import type { Expression, Gesture } from '@experience/room-spec';

/** Face channels: brows −1 (frown) to 1 (raised), inner brow lift for worry, eye opening
 * 0–1.25, smile −1–1, mouth opening 0–1, roundness for "oh", blush 0–1. */
export type Face = {
  brow: number;
  worry: number;
  eye: number;
  smile: number;
  open: number;
  round: number;
  blush: number;
};

export const FACES: Record<Expression, Face> = {
  neutral: { brow: 0, worry: 0, eye: 1, smile: 0.25, open: 0, round: 0, blush: 0.15 },
  happy: { brow: 0.2, worry: 0, eye: 0.95, smile: 0.85, open: 0.15, round: 0, blush: 0.45 },
  sad: { brow: -0.1, worry: 0.9, eye: 0.8, smile: -0.6, open: 0, round: 0, blush: 0 },
  surprised: { brow: 0.9, worry: 0, eye: 1.25, smile: 0, open: 0.6, round: 1, blush: 0.2 },
  thinking: { brow: 0.35, worry: 0.3, eye: 0.85, smile: 0, open: 0, round: 0.3, blush: 0 },
  laughing: { brow: 0.3, worry: 0, eye: 0.25, smile: 1, open: 0.7, round: 0, blush: 0.6 },
  excited: { brow: 0.6, worry: 0, eye: 1.15, smile: 0.95, open: 0.5, round: 0, blush: 0.5 },
  sleepy: { brow: -0.2, worry: 0.2, eye: 0.3, smile: 0.1, open: 0.05, round: 0.2, blush: 0 },
};

/**
 * Arms are [upper, elbow] in degrees from hanging straight down; positive turns outward,
 * negative brings the hand in front of the body. `a` is the arm on the viewer's left, `b` the
 * leading arm on the viewer's right (the stage mirrors the whole character to face left).
 * `head` tilts (degrees) and `hop` lifts the body (0–1).
 */
export type Pose2D = { a: [number, number]; b: [number, number]; head: number; hop: number };
export type Action = Gesture | 'eat' | 'drink' | 'read' | 'sleep' | 'dance' | 'crouch';

const rest: Pose2D = { a: [10, -12], b: [10, -12], head: 0, hop: 0 };
const s = Math.sin;

export function actionPose(action: Action, t: number): Pose2D {
  switch (action) {
    case 'wave':
      return { ...rest, b: [155, -20 + 25 * s(t * 9)], head: 4 };
    case 'explain':
      return { ...rest, a: [15, -30], b: [45, -70 + 10 * s(t * 2)], head: 3 * s(t * 1.5) };
    case 'think':
      return { ...rest, b: [-20, -150], head: -7 };
    case 'celebrate':
      return { a: [160, -10], b: [160, -10], head: 0, hop: Math.max(0, s(t * 6)) * 0.4 };
    case 'cheer':
      return {
        a: [150 + 15 * s(t * 8), -20],
        b: [150 + 15 * s(t * 8 + Math.PI), -20],
        head: 4 * s(t * 8),
        hop: Math.max(0, s(t * 5)) * 0.6,
      };
    case 'nod':
      return { ...rest, head: 8 * s(t * 7) };
    case 'point':
      return { ...rest, b: [95, -5], head: 3 };
    case 'eat':
      return { ...rest, b: [-15, -140 + 15 * s(t * 6)], head: 4 + 2 * s(t * 6) };
    case 'drink':
      return { ...rest, b: [-10, -165], head: -9 };
    case 'read':
      return { ...rest, a: [12, -95], b: [12, -95], head: 8 };
    case 'sleep':
      return { ...rest, head: 12 };
    case 'dance':
      return {
        a: [60 + 40 * s(t * 4), -40],
        b: [60 + 40 * s(t * 4 + Math.PI), -40],
        head: 8 * s(t * 4),
        hop: Math.max(0, s(t * 8)) * 0.25,
      };
    case 'crouch':
      return { ...rest, a: [25, -20], b: [25, -20], hop: -0.25 };
    default:
      return rest;
  }
}

export const REST_POSE = rest;
