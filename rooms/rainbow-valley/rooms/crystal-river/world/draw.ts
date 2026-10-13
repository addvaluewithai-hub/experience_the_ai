import type * as Phaser from 'phaser';
import { asleep, fillShape, lerpColor } from '../../../world/draw';

type G = Phaser.GameObjects.Graphics;
export const RAINBOW = [0xff8fa3, 0xffc078, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa, 0xe599f7];

/** A crystal of three shards on its stone; `wake` 0 is grey and asleep, 1 is its full colour. */
export function drawCrystal(g: G, x: number, y: number, color: number, wake: number) {
  g.clear();
  g.fillStyle(0x8b84a6, 1).fillEllipse(x, y + 8, 110, 30);
  g.fillStyle(0xa7a1bf, 1).fillEllipse(x - 6, y + 2, 90, 22);
  const body = lerpColor(asleep(color, 0.8), color, wake);
  const light = lerpColor(body, 0xffffff, 0.55);
  const shards: [number, number, number, number][] = [
    [-34, -10, 62, 0],
    [12, 34, 78, 0],
    [-14, 14, 118, 1],
  ];
  for (const [left, right, height, lit] of shards) {
    const top = { x: x + (left + right) / 2, y: y - height };
    const base = [
      { x: x + left, y: y - 4 },
      { x: x + left + 2, y: y - height * 0.7 },
      top,
      { x: x + right - 2, y: y - height * 0.7 },
      { x: x + right, y: y - 4 },
    ];
    g.fillStyle(body, 0.92);
    fillShape(g, base);
    g.fillStyle(light, lit ? 0.55 : 0.35);
    fillShape(g, [base[1], top, { x: top.x, y: y - 4 }, base[0]]);
    g.lineStyle(1.5, 0xffffff, 0.35 + wake * 0.4);
    g.strokePoints(base as Phaser.Math.Vector2[], true);
  }
}

/** The time of day a crystal belongs to: a low sun, a high sun, a moon. */
export function drawIcon(g: G, kind: 'الصبح' | 'الضهر' | 'بالليل', x: number, y: number) {
  const glow = 0xfff3c4;
  if (kind === 'بالليل') {
    g.fillStyle(glow, 1).fillCircle(x, y, 13);
    g.fillStyle(0x6d5bb5, 1).fillCircle(x + 7, y - 4, 11);
    return;
  }
  const r = kind === 'الصبح' ? 10 : 13;
  g.lineStyle(2.5, 0xffd166, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineBetween(
      x + Math.cos(a) * (r + 4),
      y + Math.sin(a) * (r + 4),
      x + Math.cos(a) * (r + 9),
      y + Math.sin(a) * (r + 9),
    );
  }
  g.fillStyle(0xffd166, 1).fillCircle(x, y, r);
}

/**
 * The water in front: bands that wake with today's crystals, ripples drifting with the
 * current, and rainbow light when all three are awake.
 */
export function drawWater(
  g: G,
  top: number,
  width: number,
  bottom: number,
  t: number,
  wake: number,
) {
  g.clear();
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const deep = i / (bands - 1);
    const color = lerpColor(asleep(0x7dd3fc, 0.6 * (1 - wake)), 0x3b82c4, deep * 0.55);
    g.fillStyle(color, 1);
    g.fillRect(0, top + ((bottom - top) * i) / bands, width, (bottom - top) / bands + 1);
  }
  if (wake >= 1)
    RAINBOW.forEach((c, i) => {
      const y = top + 10 + i * 9 + Math.sin(t * 1.5 + i) * 3;
      g.fillStyle(c, 0.28);
      g.fillRect(0, y, width, 5);
    });
  g.lineStyle(2, 0xffffff, 0.35 + wake * 0.3);
  for (let i = 0; i < 18; i++) {
    const y = top + 14 + ((i * 37) % (bottom - top - 20));
    const x = ((i * 173 + t * (30 + (i % 4) * 12)) % (width + 120)) - 60;
    g.beginPath();
    g.arc(x, y, 22 + (i % 3) * 8, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
  }
}
