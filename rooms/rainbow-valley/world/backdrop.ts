import type * as Phaser from 'phaser';
import { asleep, ellipsePoints, fillShape, hillPoints, lerpColor } from './draw';

export const VIEW = { width: 960, height: 540 };
/** The widest view the screen-fixed layers must cover (a 3.5:1 screen at the valley's height). */
const WIDEST = 1900;
/** The valley: a band of ground below the grass keeps the unicorn above the controls. */
export const WORLD = { width: 1920, height: 620 };
export const GRASS = 492;
/** How asleep the valley's colours are, until habits wake them (0 awake, 1 grey). */
const SLEEP = 0.55;
const RAINBOW = [0xff6b6b, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x748ffc, 0xda77f2];

type Movable = { x: number; y: number };
type Layer = { item: Movable; factor: number; x: number; y: number };
export type Cloud = { layer: Layer; speed: number };
export type Backdrop = { stars: Phaser.GameObjects.Arc[]; clouds: Cloud[]; depth: Depth };

/**
 * Depth by hand: far layers move less than the view. The camera zooms to fit any screen, and
 * Phaser's scroll factors drift under zoom, so each far layer follows the visible area itself.
 */
export class Depth {
  private layers: Layer[] = [];
  add<T extends Movable>(item: T, factor: number): T {
    this.place(item, factor);
    return item;
  }
  place(item: Movable, factor: number): Layer {
    const layer = { item, factor, x: item.x, y: item.y };
    this.layers.push(layer);
    return layer;
  }
  follow(view: Movable) {
    for (const l of this.layers) {
      l.item.x = l.x + view.x * (1 - l.factor);
      l.item.y = l.y + view.y * (1 - l.factor);
    }
  }
}

/** The valley at dawn, drawn in layers that move at different depths. */
export function drawBackdrop(scene: Phaser.Scene): Backdrop {
  const add = scene.add;
  const depth = new Depth();
  const sky = depth.add(add.graphics(), 0);
  const bands = 54;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const color =
      t < 0.5
        ? lerpColor(0x4a3a8c, 0xa98be6, t / 0.5)
        : lerpColor(0xa98be6, 0xffd3e4, (t - 0.5) / 0.5);
    sky.fillStyle(color, 1);
    // A margin either side covers the frame a fast camera move is ahead of the layers.
    sky.fillRect(
      -400,
      Math.floor((i * WORLD.height) / bands),
      WIDEST + 800,
      WORLD.height / bands + 2,
    );
  }
  const stars = Array.from({ length: 70 }, (_, i) => {
    const x = (i * 211) % 2100;
    const y = 12 + ((i * 97) % 230) * (0.4 + 0.6 * ((i % 5) / 4));
    return depth.add(
      add.circle(x, y, i % 7 === 0 ? 2.2 : 1.3, 0xfffbe6, 0.35 + (i % 4) * 0.12),
      0.12,
    );
  });
  const rainbow = depth.add(add.graphics(), 0.35);
  RAINBOW.forEach((color, i) => {
    rainbow.lineStyle(16, asleep(color, SLEEP + 0.15), 0.3);
    rainbow.beginPath();
    rainbow.arc(760, 560, 470 - i * 16, Math.PI, Math.PI * 2);
    rainbow.strokePath();
  });
  const layer = (factor: number, base: number, color: number, waves: number[][]) =>
    fillShape(
      depth.add(add.graphics(), factor).fillStyle(color, 1),
      hillPoints(WIDEST + WORLD.width * factor, base, WORLD.height, waves),
    );
  layer(0.3, 330, 0x8e7ad6, [
    [26, 170, 0],
    [14, 61, 1],
  ]);
  layer(0.6, 390, 0xb19ce8, [
    [22, 140, 2],
    [10, 47, 0.5],
  ]);
  const clouds = [0.25, 0.45, 0.7, 1].flatMap((factor, row) =>
    [0, 1, 2].map((i) => cloud(scene, depth, factor, row, i)),
  );
  layer(1, GRASS + 8, asleep(0x9be7c4, SLEEP), [
    [8, 120, 0],
    [4, 37, 1],
  ]);
  drawRiver(scene);
  drawBridge(scene);
  drawMeadow(scene);
  layer(1, GRASS + 64, asleep(0x6fd1a4, SLEEP), [[5, 60, 0.3]]);
  return { stars, clouds, depth };
}

function cloud(scene: Phaser.Scene, depth: Depth, factor: number, row: number, i: number): Cloud {
  if (!scene.textures.exists('valley-cloud')) {
    const g = scene.add.graphics().fillStyle(0xffffff, 1);
    for (const [x, y, r] of [
      [100, 62, 46],
      [56, 72, 32],
      [146, 70, 34],
      [118, 40, 30],
    ])
      g.fillCircle(x, y, r);
    g.generateTexture('valley-cloud', 200, 110).destroy();
  }
  const shape = scene.add
    .image(180 + i * 640 + row * 210, 70 + row * 46 + (i % 2) * 22, 'valley-cloud')
    .setScale(0.55 + factor * 0.5)
    .setTint(0xfdf4ff)
    .setAlpha(0.5 + row * 0.12);
  return { layer: depth.place(shape, factor), speed: 4 + factor * 6 };
}

/** The crystal river, winding from the far hills to the front. */
function drawRiver(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  const water = asleep(0x7dd3fc, SLEEP);
  g.fillStyle(water, 0.9);
  fillShape(g, [
    { x: 330, y: GRASS + 2 },
    { x: 360, y: GRASS + 2 },
    { x: 440, y: 520 },
    { x: 520, y: WORLD.height },
    { x: 300, y: WORLD.height },
    { x: 360, y: 520 },
  ]);
  for (const [x, y, s] of [
    [312, 486, 1],
    [470, 498, 0.8],
    [250, 500, 0.7],
    [540, 488, 0.9],
  ]) {
    g.fillStyle(asleep(0xc4b5fd, SLEEP - 0.1), 0.95);
    fillShape(g, [
      { x, y: y - 26 * s },
      { x: x + 9 * s, y: y - 6 * s },
      { x, y: y + 4 },
      { x: x - 9 * s, y: y - 6 * s },
    ]);
  }
}

/** The rainbow bridge: an arch the unicorn can stand on at its top. */
function drawBridge(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  RAINBOW.forEach((color, i) => {
    g.lineStyle(9, asleep(color, SLEEP), 0.95);
    g.beginPath();
    g.arc(1495, 560, 285 - i * 9, Math.PI * 1.08, Math.PI * 1.92);
    g.strokePath();
  });
}

function drawMeadow(scene: Phaser.Scene) {
  const g = scene.add.graphics();
  for (let i = 0; i < 34; i++) {
    const x = 660 + ((i * 53) % 620);
    const y = GRASS + 14 + ((i * 29) % 30);
    g.fillStyle(asleep(0x58b88a, SLEEP), 1);
    g.fillRect(x - 1, y - 10, 2, 10);
    g.fillStyle(asleep(RAINBOW[i % RAINBOW.length], SLEEP), 1);
    fillShape(g, ellipsePoints(x, y - 12, 4, 4, 0, 8));
  }
}
