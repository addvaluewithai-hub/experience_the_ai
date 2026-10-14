import * as Phaser from 'phaser';
import { Director, pixelDensity, type Anchors, type Shots } from '@experience/kit-phaser';
import { startGame } from '@experience/kit-phaser/game';
import { dayOf, todayOf } from './day';
import { drawKitchen, type Kitchen } from './kitchen';
import { FLOOR, HOME, lightOf, SPOTS, WORLD } from './layout';
import type { KitchenModel } from './model';
import { Noor } from './noor';

const SHOTS: Shots = {
  // The window first (the hour of the day), then across to Noor, who waves.
  arrival: (reduced, at) => [
    { x: 530, y: 210, zoom: reduced ? 1.2 : 1.7, seconds: 0, hold: reduced ? 0.3 : 0.9 },
    { x: at.x, y: 380, zoom: 1, seconds: reduced ? 0.8 : 2.2 },
  ],
  // Across the whole kitchen, for a plan of the day.
  'kitchen-tour': (reduced) =>
    reduced
      ? [{ x: 800, y: 340, zoom: 1, seconds: 0.6, hold: 1.5 }]
      : [
          { x: 230, y: 240, zoom: 1.4, seconds: 1.4, hold: 0.6 },
          { x: 830, y: 330, zoom: 1.2, seconds: 1.8, hold: 0.4 },
          { x: 1300, y: 330, zoom: 1.3, seconds: 1.6, hold: 0.6 },
          { x: 800, y: 340, zoom: 1, seconds: 1.2 },
        ],
};

class KitchenScene extends Phaser.Scene {
  private kitchen!: Kitchen;
  private noor!: Noor;
  private director!: Director;
  private focus: { x: number; y: number } = { x: SPOTS.counter.x, y: 380 };
  private reduced: boolean;
  private shown = '';

  constructor(
    private model: KitchenModel,
    private anchors: Anchors,
  ) {
    super('noor-kitchen');
    this.reduced = Boolean(model.options.reducedMotion);
  }

  create() {
    this.kitchen = drawKitchen(this);
    this.noor = new Noor(this);
    this.director = new Director(this, this.reduced, SHOTS);
    const camera = this.cameras.main;
    camera.startFollow(this.focus, false, 0.05, 0.05);
    camera.setZoom(this.scale.height / WORLD.height);
    camera.centerOn(this.focus.x, this.focus.y);
    this.scale.on('resize', (size: Phaser.Structs.Size) => camera.setSize(size.width, size.height));
  }

  /** A wide screen rests on the chalkboard, window and counter while Noor is there; a
   * narrow one follows her. */
  private rest() {
    const x = this.model.x;
    const wide = this.scale.width / (this.scale.height / WORLD.height);
    return wide > 900 ? Math.min(Math.max(HOME, x - wide / 2 + 170), x + wide / 2 - 170) : x;
  }

  private aim(x: number, y: number) {
    const camera = this.cameras.main;
    this.focus.x = inside(x, this.scale.width / camera.zoom, WORLD.width);
    this.focus.y = inside(y, this.scale.height / camera.zoom, WORLD.height);
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const m = this.model;
    m.step(dt);
    const at = { x: m.x, y: FLOOR };
    this.noor.body.setScale(0.92 * m.facing, 0.92);
    this.noor.update(
      dt,
      at,
      m.walking,
      m.gesture,
      m.modeOf('noor'),
      m.mouthOf('noor'),
      this.reduced,
    );
    // The kitchen follows the hour and the day's record (redrawn only when they change).
    const now = m.now();
    const today = todayOf(m.options.data?.() ?? {}, dayOf(now))?.values ?? {};
    const shown = JSON.stringify([
      lightOf(now.getHours()),
      now.getMinutes(),
      today.water,
      today.vitamins,
      today.gym,
    ]);
    if (shown !== this.shown) {
      this.shown = shown;
      this.kitchen.light(lightOf(now.getHours()));
      this.kitchen.clock(now);
      this.kitchen.water(typeof today.water === 'number' ? today.water : 0);
      this.kitchen.vitamins(Boolean(today.vitamins));
      this.kitchen.bag(typeof today.gym === 'string' ? today.gym : undefined);
    }
    const camera = this.cameras.main;
    const fit = this.scale.height / WORLD.height;
    for (const scene of m.takeScenes()) {
      if (scene.id === 'arrival') m.perform('wave', 2.6);
      const from = { x: camera.midPoint.x, y: camera.midPoint.y, zoom: camera.zoom / fit };
      this.director.run(scene.id, from, scene.done, { x: this.rest(), y: 380 });
    }
    if (this.director.active) {
      camera.setLerp(1, 1);
      camera.setZoom(fit * this.director.view.zoom);
      this.aim(this.director.view.x, this.director.view.y);
    } else {
      camera.setLerp(0.05, 0.05);
      camera.setZoom(camera.zoom + (fit - camera.zoom) * Math.min(1, dt * 2));
      this.aim(this.rest(), 380);
    }
    this.anchors.project(camera, pixelDensity());
  }
}

// The camera never shows past the kitchen's walls: its aim is kept inside them by hand.
function inside(aim: number, view: number, size: number) {
  return view >= size ? size / 2 : Math.min(Math.max(aim, view / 2), size - view / 2);
}

export const startKitchen = (parent: HTMLElement, model: KitchenModel, anchors: Anchors) =>
  startGame(parent, new KitchenScene(model, anchors), '#dbe4dc');
