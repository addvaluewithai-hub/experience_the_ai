import type { MouthFrame, Viseme } from '@experience/room-spec';

/**
 * Acoustic mouth shapes from PCM, adapted from pixilive feat/character-engine (ee91c77f),
 * which adapted it from PixiLive main (d85f0d5). A heuristic for believable animation:
 * energy, zero crossings and two formant estimates. Not phoneme alignment, and never
 * evidence about anyone's pronunciation.
 */
const clamp = (v: number, low = 0, high = 1) => Math.max(low, Math.min(high, v));

/** How open, wide and round each shape is at full voice. */
const SHAPES: Record<Viseme, { open: number; width: number; round: number }> = {
  REST: { open: 0.03, width: 0.4, round: 0.06 },
  MBP: { open: 0, width: 0.4, round: 0.03 },
  AA: { open: 0.85, width: 0.67, round: 0.08 },
  EE: { open: 0.32, width: 0.88, round: 0 },
  IH: { open: 0.38, width: 0.72, round: 0.05 },
  OH: { open: 0.72, width: 0.42, round: 0.74 },
  OO: { open: 0.45, width: 0.29, round: 0.98 },
  FV: { open: 0.16, width: 0.55, round: 0.02 },
  L: { open: 0.46, width: 0.61, round: 0.04 },
  S: { open: 0.2, width: 0.6, round: 0.06 },
  CH: { open: 0.28, width: 0.5, round: 0.6 },
  WQ: { open: 0.24, width: 0.35, round: 0.95 },
};

function goertzel(samples: Float32Array, rate: number, frequency: number) {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / rate);
  let s1 = 0;
  let s2 = 0;
  for (const sample of samples) {
    const s0 = sample + coefficient * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.max(0, s1 * s1 + s2 * s2 - coefficient * s1 * s2);
}

const BANDS = Array.from({ length: 21 }, (_, i) => 250 + i * 150);

export function analyzeFrame(samples: Int16Array, rate: number): MouthFrame {
  if (!samples.length) return { viseme: 'REST', open: 0, energy: 0 };
  const windowed = new Float32Array(samples.length);
  let squares = 0;
  let crossings = 0;
  let previous = samples[0] / 32768;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i] / 32768;
    squares += value * value;
    if (value >= 0 !== previous >= 0) crossings++;
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / Math.max(1, samples.length - 1));
    windowed[i] = (value - 0.94 * previous) * hamming;
    previous = value;
  }
  const energy = clamp((Math.sqrt(squares / samples.length) - 0.0045) * 8.8);
  if (energy < 0.035) return { viseme: 'REST', open: SHAPES.REST.open, energy };
  const powers = BANDS.map((f) => goertzel(windowed, rate, f));
  const smooth = powers.map(
    (p, i) => (powers[i - 1] ?? p) * 0.25 + p * 0.5 + (powers[i + 1] ?? p) * 0.25,
  );
  let f1 = 500;
  let f2 = 1500;
  let best1 = -1;
  let best2 = -1;
  let total = 0;
  let weighted = 0;
  BANDS.forEach((f, i) => {
    total += smooth[i];
    weighted += smooth[i] * f;
    if (f <= 1000 && smooth[i] > best1) [best1, f1] = [smooth[i], f];
  });
  BANDS.forEach((f, i) => {
    if (f >= Math.max(850, f1 + 300) && smooth[i] > best2) [best2, f2] = [smooth[i], f];
  });
  const centroid = total > 0 ? weighted / total : 1200;
  const noise = clamp((centroid - 1350) / 1500) * clamp((crossings / samples.length - 0.05) / 0.2);
  let viseme: Viseme;
  if (noise > 0.34 && energy < 0.72) viseme = centroid < 2050 ? 'FV' : 'S';
  else if (f1 < 475 && f2 > 1700) viseme = 'EE';
  else if (f1 < 475 && f2 < 1250) viseme = 'OO';
  else if (f1 >= 700) viseme = 'AA';
  else if (f2 < 1350) viseme = 'OH';
  else viseme = 'AA';
  const shape = SHAPES[viseme];
  return {
    viseme,
    energy,
    open: clamp(shape.open * (0.55 + energy * 0.5)),
    width: shape.width,
    round: shape.round,
  };
}

/** Mouth frames every 20 ms (24 ms windows), with offsets in seconds from the chunk start. */
export function analyzePcm(
  samples: Int16Array,
  rate: number,
): { offset: number; frame: MouthFrame }[] {
  const size = Math.max(160, Math.round(rate * 0.024));
  const hop = Math.max(120, Math.round(rate * 0.02));
  if (samples.length <= size) return [{ offset: 0, frame: analyzeFrame(samples, rate) }];
  const frames = [];
  for (let start = 0; start < samples.length; start += hop)
    frames.push({
      offset: start / rate,
      frame: analyzeFrame(samples.subarray(start, Math.min(samples.length, start + size)), rate),
    });
  return frames;
}
