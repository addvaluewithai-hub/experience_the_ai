import type * as Phaser from 'phaser';

type Point = { x: number; y: number };
const MAX_STARS = 220;

/** The points of a word drawn in a font: where the stars go to write it. */
export function glyphPoints(text: string, size = 84): Point[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const font = `700 ${size}px system-ui, "Segoe UI", sans-serif`;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + size;
  canvas.height = Math.ceil(size * 1.6);
  ctx.font = font;
  ctx.direction = /[؀-ۿ]/.test(text) ? 'rtl' : 'ltr';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let step = 6; step < 20; step++) {
    const points: Point[] = [];
    for (let y = 0; y < height; y += step)
      for (let x = 0; x < width; x += step)
        if (data[(y * width + x) * 4 + 3] > 140)
          points.push({ x: x - width / 2, y: y - height / 2 });
    if (points.length <= MAX_STARS) return points;
  }
  return [];
}

/** Laila's name for the unicorn, written in the sky above the meadow in stars. */
export class NameInStars {
  private stars: Phaser.GameObjects.Arc[] = [];
  private shown = '';
  private time = 0;

  constructor(
    private scene: Phaser.Scene,
    private at: Point,
  ) {}

  /** Keeps the sky in step with the name; true when a new name has just been written. */
  update(dt: number, name: string | null, animate: boolean): boolean {
    this.time += dt;
    this.stars.forEach((star, i) => {
      if (!star.getData('settled')) return;
      star.setAlpha(0.65 + 0.35 * Math.sin(this.time * 2.2 + i * 1.7));
    });
    const next = name ?? '';
    if (next === this.shown) return false;
    this.write(next, animate);
    return Boolean(next) && animate;
  }

  private write(name: string, animate: boolean) {
    for (const star of this.stars) star.destroy();
    this.shown = name;
    // The stars write the name in its own reading direction.
    const ahead = /[\u0600-\u06ff]/.test(name) ? -1 : 1;
    this.stars = glyphPoints(name).map((p, i) => {
      const star = this.scene.add
        .circle(0, 0, 1.6 + (i % 3) * 0.6, 0xfff6cc, 1)
        .setBlendMode('ADD');
      const to = { x: this.at.x + p.x, y: this.at.y + p.y };
      if (!animate) {
        star.setPosition(to.x, to.y).setData('settled', true);
        return star;
      }
      star
        .setPosition(
          this.at.x + p.x + (Math.random() - 0.5) * 120,
          this.at.y + p.y - 40 - Math.random() * 60,
        )
        .setAlpha(0);
      this.scene.tweens.add({
        targets: star,
        x: to.x,
        y: to.y,
        alpha: 1,
        duration: 900,
        delay: 300 + Math.max(0, (ahead * p.x + 240) * 3),
        ease: 'Cubic.easeOut',
        onComplete: () => star.setData('settled', true),
      });
      return star;
    });
  }
}
