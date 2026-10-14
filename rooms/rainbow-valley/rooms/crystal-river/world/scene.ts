import * as Phaser from 'phaser';
import type { FlightState } from '@experience/kit-flight';
import { hillPoints, fillShape, lerpColor } from '../../../world/draw';
import { Director, type Shots } from '@experience/kit-phaser';
import { startGame } from '@experience/kit-phaser/game';
import { Unicorn } from '../../../world/unicorn';
import { drawCrystal, drawIcon, drawWater, RAINBOW } from './draw';
import { CRYSTALS, type RiverModel } from './model';

const WORLD = { width: 1280, height: 620 };
const SHORE = 470;
const BOX = { left: 140, width: 1000, top: 70, height: 400 };
const toWorld = (s: FlightState) => ({
  x: BOX.left + s.x * BOX.width,
  y: BOX.top + s.y * BOX.height,
});
const crystalX = (x: number) => BOX.left + x * BOX.width;

const SHOTS: Shots = {
  // Down at the water, then up to the three crystals as the unicorn flies in.
  arrival: (reduced) => [
    { x: 640, y: 560, zoom: reduced ? 1.2 : 1.9, seconds: 0, hold: reduced ? 0.2 : 0.5 },
    { x: 640, y: 380, zoom: 1, seconds: reduced ? 0.8 : 2.2 },
  ],
  crystals: (reduced) =>
    reduced
      ? [{ x: 640, y: 380, zoom: 1, seconds: 0.6, hold: 1.5 }]
      : [
          { x: crystalX(0.2), y: 400, zoom: 1.6, seconds: 1.2, hold: 0.5 },
          { x: crystalX(0.5), y: 400, zoom: 1.6, seconds: 1.2, hold: 0.5 },
          { x: crystalX(0.8), y: 400, zoom: 1.6, seconds: 1.2, hold: 0.5 },
          { x: 640, y: 380, zoom: 1, seconds: 1 },
        ],
};

class RiverScene extends Phaser.Scene {
  private unicorn!: Unicorn;
  private water!: Phaser.GameObjects.Graphics;
  private crystals: {
    g: Phaser.GameObjects.Graphics;
    glow: Phaser.GameObjects.Arc;
    wake: number;
    drawn: number;
  }[] = [];
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private director!: Director;
  private focus = { x: 640, y: 380 };
  private clock = 0;
  private reduced: boolean;

  constructor(private model: RiverModel) {
    super('crystal-river');
    this.reduced = Boolean(model.options.reducedMotion);
  }

  create() {
    const dot = this.add.graphics();
    for (const [r, a] of [
      [8, 0.15],
      [5, 0.4],
      [3, 1],
    ])
      dot.fillStyle(0xffffff, a).fillCircle(8, 8, r);
    dot.generateTexture('river-spark', 16, 16).destroy();
    const sky = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      const t = i / 39;
      sky.fillStyle(
        t < 0.6
          ? lerpColor(0x5b4a9e, 0xb79ce8, t / 0.6)
          : lerpColor(0xb79ce8, 0xffd3e4, (t - 0.6) / 0.4),
        1,
      );
      sky.fillRect(-200, (i * SHORE) / 40, WORLD.width + 400, SHORE / 40 + 2);
    }
    fillShape(
      this.add.graphics().fillStyle(0x9d8be0, 1),
      hillPoints(WORLD.width, 330, SHORE, [
        [18, 120, 1],
        [8, 40, 0],
      ]),
    );
    fillShape(
      this.add.graphics().fillStyle(0x9fd8bd, 1),
      hillPoints(WORLD.width, 420, SHORE + 10, [[6, 90, 0.5]]),
    );
    const icons = this.add.graphics();
    for (const c of CRYSTALS) {
      const x = crystalX(c.x);
      const glow = this.add.circle(x, SHORE - 55, 80, c.color, 0).setBlendMode('ADD');
      this.crystals.push({ g: this.add.graphics(), glow, wake: 0, drawn: -1 });
      drawIcon(icons, c.when, x, SHORE - 150);
    }
    this.water = this.add.graphics();
    this.add.particles(0, 0, 'river-spark', {
      x: { min: 0, max: WORLD.width },
      y: { min: SHORE, max: WORLD.height },
      lifespan: 1600,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      frequency: this.reduced ? 700 : 160,
      blendMode: 'ADD',
    });
    this.burst = this.add.particles(0, 0, 'river-spark', {
      speed: { min: 60, max: 220 },
      lifespan: 1200,
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: RAINBOW,
      blendMode: 'ADD',
      emitting: false,
    });
    this.unicorn = new Unicorn(this);
    this.director = new Director(this, this.reduced, SHOTS);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD.width, WORLD.height);
    camera.startFollow(this.focus, false, 0.06, 0.06);
    camera.setZoom(this.scale.height / WORLD.height);
    camera.centerOn(640, 380);
    this.scale.on('resize', (size: Phaser.Structs.Size) => camera.setSize(size.width, size.height));
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    this.clock += dt;
    const s = this.model.step(dt);
    const at = toWorld(s);
    const m = this.model;
    this.unicorn.update(
      dt,
      at,
      s,
      m.wing,
      m.modeOf('unicorn'),
      m.mouthOf('unicorn'),
      this.reduced,
      false,
    );
    const awake = m.awake();
    CRYSTALS.forEach((c, i) => {
      const crystal = this.crystals[i];
      crystal.wake += ((awake.has(c.id) ? 1 : 0) - crystal.wake) * Math.min(1, dt * 1.5);
      if (Math.abs(crystal.wake - crystal.drawn) > 0.01) {
        drawCrystal(crystal.g, crystalX(c.x), SHORE - 6, c.color, crystal.wake);
        crystal.drawn = crystal.wake;
      }
      const pulse = this.reduced ? 1 : 1 + Math.sin(this.clock * 2 + i) * 0.08;
      crystal.glow.setAlpha(0.32 * crystal.wake).setScale(pulse);
    });
    drawWater(this.water, SHORE, WORLD.width, WORLD.height, this.clock, awake.size / 3);
    const camera = this.cameras.main;
    const fit = this.scale.height / WORLD.height;
    for (const scene of m.takeScenes()) {
      if (scene.id === 'arrival') m.go('near-laila', 0.5);
      const from = { x: camera.midPoint.x, y: camera.midPoint.y, zoom: camera.zoom / fit };
      this.director.run(scene.id, from, scene.done, at);
    }
    for (const moment of m.takeMoments()) {
      const c = CRYSTALS.find((x) => x.id === moment.at);
      const x = c ? crystalX(c.x) : at.x;
      this.burst.explode(
        Math.round((moment.big ? 50 : 20) * (this.reduced ? 0.4 : 1)),
        x,
        c ? SHORE - 80 : at.y,
      );
      if (moment.big && !this.reduced) camera.flash(260, 255, 240, 250);
    }
    if (this.director.active) {
      camera.setLerp(1, 1);
      Object.assign(this.focus, { x: this.director.view.x, y: this.director.view.y });
      camera.setZoom(fit * this.director.view.zoom);
    } else {
      camera.setLerp(0.06, 0.06);
      Object.assign(this.focus, at);
      camera.setZoom(camera.zoom + (fit - camera.zoom) * Math.min(1, dt * 2));
    }
  }
}

export const startRiver = (parent: HTMLElement, model: RiverModel) =>
  startGame(parent, new RiverScene(model), '#5b4a9e');
