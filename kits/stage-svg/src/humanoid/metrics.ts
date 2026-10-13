import { type CharacterLook } from '../world/look';

/** Body measurements in stage units (an adult stands about 190 tall). */
export type Metrics = {
  head: number;
  neck: number;
  torso: number;
  upper: number;
  fore: number;
  thigh: number;
  shin: number;
  shoulder: number;
  hip: number;
  limb: number;
};

const BASE: Record<CharacterLook['age'], Metrics> = {
  adult: {
    head: 23,
    neck: 7,
    torso: 64,
    upper: 32,
    fore: 29,
    thigh: 38,
    shin: 38,
    shoulder: 27,
    hip: 20,
    limb: 10,
  },
  teen: {
    head: 22,
    neck: 6,
    torso: 55,
    upper: 28,
    fore: 25,
    thigh: 33,
    shin: 33,
    shoulder: 23,
    hip: 17,
    limb: 9,
  },
  child: {
    head: 24,
    neck: 5,
    torso: 42,
    upper: 21,
    fore: 19,
    thigh: 23,
    shin: 23,
    shoulder: 19,
    hip: 15,
    limb: 8.5,
  },
};

export function metricsOf(look: CharacterLook): Metrics {
  const m = BASE[look.age];
  const { head, height, build } = look.proportions;
  return {
    head: m.head * head,
    neck: m.neck * height,
    torso: m.torso * height,
    upper: m.upper * height,
    fore: m.fore * height,
    thigh: m.thigh * height,
    shin: m.shin * height,
    shoulder: m.shoulder * build,
    hip: m.hip * build,
    limb: m.limb * build,
  };
}

export const legLength = (m: Metrics) => m.thigh + m.shin;
