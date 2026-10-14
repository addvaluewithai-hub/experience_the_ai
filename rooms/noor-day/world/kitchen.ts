import type * as Phaser from 'phaser';
import { BAG, COUNTER, FLOOR, WORLD, type Light } from './layout';

type G = Phaser.GameObjects.Graphics;
const SKY: Record<Light, [number, number]> = {
  morning: [0xffd59a, 0xfff1d6],
  day: [0x9fd3f7, 0xe3f3ff],
  evening: [0xf3a46b, 0x8a78c9],
  night: [0x1c2452, 0x2f3b78],
};
const WINDOW = { x: 370, y: 80, size: 220 };
const FRIDGE = 1100;
const DOOR = 1325;
const CLOCK = { x: 1401, y: 70 };
const SHELF = 620;
const LAMP = 760;
const WATER = 780;

/** The parts of the kitchen that change with the day; the rest is drawn once. */
export type Kitchen = {
  light(light: Light): void;
  water(glasses: number): void;
  vitamins(taken: boolean): void;
  bag(step: string | undefined): void;
  clock(now: Date): void;
};

function box(g: G, x: number, y: number, w: number, h: number, color: number, r = 6) {
  g.fillStyle(color, 1).fillRoundedRect(x, y, w, h, r);
}

/** Walls, window, cabinets, counter, fridge and door, back to front. */
export function drawKitchen(scene: Phaser.Scene): Kitchen {
  const add = scene.add;
  const wall = add.graphics();
  box(wall, -200, 0, WORLD.width + 400, FLOOR, 0xdbe4dc, 0);
  // Tiles behind the counter.
  wall.fillStyle(0xf4f6f2, 1).fillRect(COUNTER.left, 300, COUNTER.right - COUNTER.left, 120);
  wall.lineStyle(1.5, 0xc9d3cc, 1);
  for (let y = 300; y <= 420; y += 30) wall.lineBetween(COUNTER.left, y, COUNTER.right, y);
  for (let row = 0; row < 4; row++)
    for (let x = COUNTER.left + (row % 2) * 30; x < COUNTER.right; x += 60)
      wall.lineBetween(x, 300 + row * 30, x, 330 + row * 30);
  // Floor boards.
  box(wall, -200, FLOOR - 20, WORLD.width + 400, WORLD.height - FLOOR + 40, 0xb88b62, 0);
  wall.lineStyle(2, 0xa47852, 1);
  for (let x = -200; x < WORLD.width + 200; x += 140)
    wall.lineBetween(x, FLOOR - 20, x + 40, WORLD.height);
  // Chalkboard: its list is interface pinned over it.
  box(wall, 32, 74, 300, 322, 0xa77b52, 10);
  box(wall, 44, 86, 276, 298, 0x2f3b36, 4);
  // Window frame, then the sky that follows the hour, then the bars over it.
  box(wall, WINDOW.x - 8, WINDOW.y - 8, WINDOW.size + 16, WINDOW.size + 16, 0xffffff, 8);
  const sky = add.graphics();
  const frame = add.graphics();
  const mid = WINDOW.x + WINDOW.size / 2;
  frame.fillStyle(0xffffff, 1).fillRect(mid - 4, WINDOW.y, 8, WINDOW.size);
  frame.fillRect(WINDOW.x, WINDOW.y + WINDOW.size / 2 - 4, WINDOW.size, 8);
  box(frame, WINDOW.x - 20, WINDOW.y + WINDOW.size, WINDOW.size + 40, 16, 0xf2efe9, 4);
  frame.fillStyle(0xc96f4a, 1).fillRect(546, 270, 34, 30);
  frame.fillStyle(0x4f9a63, 1).fillCircle(555, 262, 14).fillCircle(572, 258, 12);
  frame.fillCircle(563, 248, 11);
  // Cabinets, a shelf with the vitamins, the hanging lamp.
  for (let x = SHELF; x < COUNTER.right - 10; x += 112) {
    box(frame, x, 60, 105, 150, 0x9cb8a6, 6);
    frame.fillStyle(0xe8d8b5, 1).fillRoundedRect(x + 88, 170, 8, 26, 3);
  }
  box(frame, SHELF, 252, 160, 10, 0xb88b62, 2);
  const vitamins = add.graphics();
  const glow = add.circle(SHELF + 70, 226, 34, 0xffe28a, 0).setBlendMode('ADD');
  frame.lineStyle(2, 0x5c5149, 1).lineBetween(LAMP, 0, LAMP, 120);
  box(frame, LAMP - 40, 118, 80, 26, 0x2f3b36, 12);
  // Counter: wooden top, sage doors, sink and hob.
  box(frame, COUNTER.left, COUNTER.top, COUNTER.right - COUNTER.left, 22, 0xd2b48c, 4);
  for (let x = COUNTER.left + 6; x < COUNTER.right - 20; x += 121) {
    box(frame, x, COUNTER.top + 30, 114, FLOOR - COUNTER.top - 50, 0x8fae9c, 6);
    frame.fillStyle(0xe8d8b5, 1).fillRoundedRect(x + 45, COUNTER.top + 44, 24, 6, 3);
  }
  frame.fillStyle(0xb9c2c6, 1).fillRoundedRect(470, COUNTER.top - 4, 130, 10, 4);
  frame.lineStyle(4, 0x8e979b, 1).lineBetween(535, COUNTER.top - 4, 535, COUNTER.top - 40);
  frame.lineBetween(535, COUNTER.top - 40, 555, COUNTER.top - 40);
  frame.fillStyle(0x2b2b2b, 1).fillRoundedRect(920, COUNTER.top - 6, 140, 10, 3);
  // Water: a jug and a glass that fills one glass at a time.
  const jug = add.graphics();
  const glass = add.graphics();
  // Fridge with its notes pinned as interface, the door, the gym bag, a wall clock.
  box(frame, FRIDGE, 110, 180, FLOOR - 125, 0xd7e7e1, 14);
  frame.lineStyle(2, 0xb7cbc3, 1).lineBetween(FRIDGE + 4, 232, FRIDGE + 176, 232);
  box(frame, FRIDGE + 162, 140, 8, 70, 0xa9bdb5, 4);
  box(frame, FRIDGE + 162, 260, 8, 110, 0xa9bdb5, 4);
  box(frame, DOOR, 130, 152, FLOOR - 145, 0xb07d55, 6);
  frame.lineStyle(3, 0x95653f, 1).strokeRoundedRect(DOOR + 16, 150, 120, 150, 4);
  frame.strokeRoundedRect(DOOR + 16, 320, 120, 200, 4);
  frame.fillStyle(0xe2c27a, 1).fillCircle(DOOR + 22, 350, 8);
  const bag = add.graphics();
  const went = add
    .text(DOOR + 76, 250, '✓', { fontSize: '44px', color: '#2f7d5b' })
    .setOrigin(0.5)
    .setVisible(false);
  box(frame, CLOCK.x - 40, CLOCK.y - 40, 80, 80, 0xffffff, 40);
  frame.lineStyle(3, 0x2f3b36, 1).strokeCircle(CLOCK.x, CLOCK.y, 38);
  const hands = add.graphics();
  // Night: the kitchen dims and closes; the lamp stays warm.
  const dark = add.rectangle(-200, 0, WORLD.width + 400, WORLD.height, 0x141a3a, 0);
  dark.setOrigin(0, 0);
  const lamp = add.circle(LAMP, 150, 260, 0xffc66e, 0).setBlendMode('ADD');
  const closed = add
    .text(LAMP + 75, 222, 'المطبخ مقفول 🌙', {
      fontFamily: 'system-ui',
      fontSize: '20px',
      color: '#2f3b36',
      backgroundColor: '#f6e6c4',
      padding: { x: 10, y: 6 },
    })
    .setOrigin(0.5, 0)
    .setVisible(false);

  return {
    light(light) {
      const [top, bottom] = SKY[light];
      sky.clear().fillGradientStyle(top, top, bottom, bottom, 1);
      sky.fillRect(WINDOW.x, WINDOW.y, WINDOW.size, WINDOW.size);
      if (light === 'night') sky.fillStyle(0xfff6d5, 1).fillCircle(WINDOW.x + 50, 130, 16);
      if (light === 'morning') sky.fillStyle(0xffffff, 0.9).fillCircle(WINDOW.x + 180, 120, 22);
      dark.setFillStyle(0x141a3a, light === 'night' ? 0.42 : light === 'evening' ? 0.12 : 0);
      lamp.setFillStyle(0xffc66e, light === 'night' ? 0.16 : light === 'evening' ? 0.08 : 0);
      closed.setVisible(light === 'night');
    },
    water(glasses) {
      const level = Math.max(0, Math.min(8, glasses)) / 8;
      jug
        .clear()
        .fillStyle(0xdff1fb, 0.75)
        .fillRoundedRect(WATER, COUNTER.top - 70, 44, 70, 8);
      jug.lineStyle(2, 0x8fbcd8, 1).strokeRoundedRect(WATER, COUNTER.top - 70, 44, 70, 8);
      glass.clear().fillStyle(0x3d8fd1, 0.85);
      glass.fillRect(WATER + 58, COUNTER.top - 4 - 48 * level, 26, 48 * level);
      glass.lineStyle(2, 0x5b7f96, 1).strokeRect(WATER + 56, COUNTER.top - 54, 30, 52);
    },
    vitamins(taken) {
      vitamins.clear().fillStyle(taken ? 0xf08a24 : 0xc7b9a6, 1);
      vitamins.fillRoundedRect(SHELF + 56, 212, 28, 40, 6);
      vitamins.fillStyle(0xffffff, 1).fillRoundedRect(SHELF + 54, 206, 32, 10, 3);
      glow.setFillStyle(0xffe28a, taken ? 0.35 : 0);
    },
    bag(step) {
      const x = step === 'رحت' ? null : (BAG[(step ?? 'none') as keyof typeof BAG] ?? BAG.none);
      bag.clear();
      went.setVisible(x === null);
      if (x === null) return;
      bag.fillStyle(0xd4473a, 1).fillRoundedRect(x - 40, FLOOR - 52, 80, 46, 18);
      bag.lineStyle(4, 0x8f2c22, 1).strokeRoundedRect(x - 22, FLOOR - 72, 44, 30, 12);
    },
    clock(now) {
      const h = ((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6) - Math.PI / 2;
      const m = now.getMinutes() * (Math.PI / 30) - Math.PI / 2;
      const { x, y } = CLOCK;
      hands.clear().lineStyle(4, 0x2f3b36, 1);
      hands.lineBetween(x, y, x + Math.cos(h) * 20, y + Math.sin(h) * 20);
      hands
        .lineStyle(2.5, 0x2f3b36, 1)
        .lineBetween(x, y, x + Math.cos(m) * 30, y + Math.sin(m) * 30);
    },
  };
}
