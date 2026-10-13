import type { Checker } from '@experience/room-spec';
import {
  ACCESSORIES,
  AGES,
  BODY_PLANS,
  BOTTOMS,
  EYES,
  HAIR,
  POSES,
  TOPS,
  type BodyPlan,
  type Locomotion,
  type Pose,
} from './kit';

/**
 * How a character looks, as a recipe: a body plan, proportions, a palette and parts from the
 * kit. The runtime draws it; nothing here is a drawing.
 */
export type CharacterLook = {
  plan: BodyPlan;
  age: (typeof AGES)[number];
  /** Each 0.8–1.2, 1 is the plan's default. */
  proportions: { head: number; height: number; build: number };
  palette: { skin: string; hair: string; top: string; bottom: string; shoes: string; eyes: string };
  parts: {
    hair: (typeof HAIR)[number];
    eyes: (typeof EYES)[number];
    top: (typeof TOPS)[number];
    bottom: (typeof BOTTOMS)[number];
    accessories: (typeof ACCESSORIES)[number][];
  };
  /** 0 calm to 1 lively: idle sway, gesture size, travel speed. */
  energy: number;
};

export type Capabilities = { locomotion: Locomotion[]; poses: Pose[] };

const HEX = /^#[0-9a-f]{6}$/i;
const DEFAULT_PALETTE = {
  skin: '#e8b08c',
  hair: '#3a2a24',
  top: '#4f7cff',
  bottom: '#2f3a55',
  shoes: '#3b3030',
  eyes: '#3a2a24',
};

/** What a look can do. Wings or a jetpack are what make flight possible. */
export function capabilitiesOf(look: CharacterLook): Capabilities {
  const fly = look.parts.accessories.includes('jetpack');
  return {
    locomotion: ['walk', 'run', 'hop', ...(fly ? (['fly'] as const) : [])],
    poses: [...POSES],
  };
}

export function validateLook(check: Checker, value: unknown, path: string): CharacterLook {
  const input = check.object(value, path);
  const number = (v: unknown, at: string, low: number, high: number, fallback: number) => {
    if (v === undefined) return fallback;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < low || v > high)
      check.at(at, `must be a number from ${low} to ${high}`);
    return typeof v === 'number' ? v : fallback;
  };
  const proportions =
    input.proportions === undefined ? {} : check.object(input.proportions, `${path}.proportions`);
  const palette = input.palette === undefined ? {} : check.object(input.palette, `${path}.palette`);
  const parts = check.object(input.parts, `${path}.parts`);
  const colors = Object.fromEntries(
    Object.entries(DEFAULT_PALETTE).map(([key, fallback]) => {
      const v = palette[key];
      if (v !== undefined && (typeof v !== 'string' || !HEX.test(v)))
        check.at(`${path}.palette.${key}`, 'must be a #rrggbb colour');
      return [key, typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback];
    }),
  ) as CharacterLook['palette'];
  const accessories = (
    parts.accessories === undefined
      ? []
      : check.list(parts.accessories, `${path}.parts.accessories`, 0, 4)
  ).map((a, i) => check.oneOf(a, ACCESSORIES, `${path}.parts.accessories[${i}]`));
  return {
    plan: check.oneOf(input.plan, BODY_PLANS, `${path}.plan`),
    age: check.oneOf(input.age ?? 'adult', AGES, `${path}.age`),
    proportions: {
      head: number(proportions.head, `${path}.proportions.head`, 0.8, 1.2, 1),
      height: number(proportions.height, `${path}.proportions.height`, 0.8, 1.2, 1),
      build: number(proportions.build, `${path}.proportions.build`, 0.8, 1.2, 1),
    },
    palette: colors,
    parts: {
      hair: check.oneOf(parts.hair ?? 'short', HAIR, `${path}.parts.hair`),
      eyes: check.oneOf(parts.eyes ?? 'round', EYES, `${path}.parts.eyes`),
      top: check.oneOf(parts.top ?? 'tshirt', TOPS, `${path}.parts.top`),
      bottom: check.oneOf(parts.bottom ?? 'pants', BOTTOMS, `${path}.parts.bottom`),
      accessories: [...new Set(accessories)],
    },
    energy: number(input.energy, `${path}.energy`, 0, 1, 0.5),
  };
}
