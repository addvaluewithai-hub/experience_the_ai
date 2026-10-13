import type * as Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;
type P = { x: number; y: number };

/** Phaser types ask for Vector2, but plain points draw the same; this keeps call sites plain. */
export const fillShape = (g: G, points: P[]) => g.fillPoints(points as Phaser.Math.Vector2[], true);
export const strokeShape = (g: G, points: P[]) =>
  g.strokePoints(points as Phaser.Math.Vector2[], true);

/** An ellipse as points, rotated by angle (radians) around its centre. */
export function ellipsePoints(cx: number, cy: number, rx: number, ry: number, angle = 0, n = 18) {
  const points: P[] = [];
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const [x, y] = [Math.cos(t) * rx, Math.sin(t) * ry];
    points.push({ x: cx + x * c - y * s, y: cy + x * s + y * c });
  }
  return points;
}

/** A wing of fanned feathers growing up and back from (0, 0). */
export function drawWing(g: G, scale: number, fill: number, line: number) {
  g.clear();
  const feathers = [-2.2, -1.85, -1.5, -1.2];
  feathers.forEach((angle, i) => {
    const length = (46 - i * 6) * scale;
    const [cx, cy] = [Math.cos(angle) * length * 0.55, Math.sin(angle) * length * 0.55];
    g.fillStyle(fill, 0.95 - i * 0.05);
    fillShape(g, ellipsePoints(cx, cy, length * 0.55, 9 * scale, angle));
    g.lineStyle(1.5, line, 0.6);
    strokeShape(g, ellipsePoints(cx, cy, length * 0.55, 9 * scale, angle));
  });
}

/** Mixes a colour toward grey: 0 keeps it, 1 is fully asleep. */
export function asleep(color: number, amount: number) {
  const [r, g, b] = [(color >> 16) & 255, (color >> 8) & 255, color & 255];
  const grey = (r + g + b) / 3;
  const mix = (c: number) => Math.round(c + (grey - c) * amount);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

export function lerpColor(a: number, b: number, t: number) {
  const ch = (c: number, shift: number) => (c >> shift) & 255;
  const mix = (shift: number) => Math.round(ch(a, shift) + (ch(b, shift) - ch(a, shift)) * t);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/** A rolling hill line across width, as a closed polygon down to bottom. */
export function hillPoints(width: number, base: number, bottom: number, waves: number[][]) {
  const points: P[] = [];
  for (let x = 0; x <= width; x += 24) {
    const y = waves.reduce((sum, [amp, len, phase]) => sum + amp * Math.sin(x / len + phase), base);
    points.push({ x, y });
  }
  points.push({ x: width, y: bottom }, { x: 0, y: bottom });
  return points;
}

/** A mouth from an audible lip frame (or a quiet smile without one). */
export function drawMouth(g: G, open: number, width: number, color: number) {
  g.clear();
  if (open < 0.06) {
    g.lineStyle(2, color, 1);
    g.beginPath();
    g.arc(0, -2, width * 0.5, 0.35, Math.PI - 0.35);
    g.strokePath();
    return;
  }
  g.fillStyle(color, 1);
  g.fillEllipse(0, 0, width * (1 - open * 0.25), 2 + open * width * 0.9);
  g.fillStyle(0xff8fab, 1);
  g.fillEllipse(0, open * width * 0.25, width * 0.5, 1 + open * width * 0.3);
}
