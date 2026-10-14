import * as Phaser from 'phaser';
import type { FlightState } from '@experience/kit-flight';
import { drawBackdrop, VIEW, WORLD, type Backdrop } from './backdrop';
import { Director } from '@experience/kit-phaser';
import { startGame } from '@experience/kit-phaser/game';
import { SHOTS } from './director';
import type { ValleyModel, ValleyMoment } from './model';
import { Moon } from './moon';
import { NameInStars } from './stars';
import { placeAt } from './places';
import { Unicorn } from './unicorn';

const PASTELS = [0xf9a8d4, 0xc4b5fd, 0x93c5fd, 0xfde68a, 0xa7f3d0];
/** The flight box in world pixels: where the unicorn's body centre may go. */
const BOX = { left: 140, width: 1640, top: 74, height: 383 };
const toWorld = (s: FlightState) => ({
  x: BOX.left + s.x * BOX.width,
  y: BOX.top + s.y * BOX.height,
});

/** Rainbow Valley: the backdrop, Grandma Moon, the unicorn and a camera that flies along. */
class ValleyScene extends Phaser.Scene {
  private unicorn!: Unicorn;
  private moon!: Moon;
  private backdrop!: Backdrop;
  private trail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private focus = { x: 0, y: 0 };
  private reduced: boolean;
  private director!: Director;
  private name!: NameInStars;
  private started = false;
  private brushed = 0;

  constructor(private model: ValleyModel) {
    super('rainbow-valley');
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
    dot.generateTexture('valley-spark', 16, 16).destroy();

    this.backdrop = drawBackdrop(this);
    this.moon = new Moon(this, this.backdrop.depth, 800, 86);
    this.name = new NameInStars(this, { x: 960, y: 150 });
    this.director = new Director(this, this.reduced, SHOTS);
    this.add.particles(0, 0, 'valley-spark', {
      x: { min: 0, max: WORLD.width },
      y: { min: 220, max: 520 },
      speedY: { min: -14, max: -4 },
      lifespan: 4200,
      scale: { start: 0.45, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: 0xfff3c4,
      frequency: this.reduced ? 900 : 260,
      blendMode: 'ADD',
    });
    this.trail = this.add.particles(0, 0, 'valley-spark', {
      speed: { min: 4, max: 26 },
      lifespan: 900,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: PASTELS,
      frequency: this.reduced ? 160 : 45,
      blendMode: 'ADD',
      emitting: false,
    });
    this.burst = this.add.particles(0, 0, 'valley-spark', {
      speed: { min: 60, max: 220 },
      lifespan: 1300,
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 40,
      tint: PASTELS,
      blendMode: 'ADD',
      emitting: false,
    });
    this.unicorn = new Unicorn(this);
    this.trail.startFollow(this.unicorn.body, -30, 0);

    const start = toWorld(this.model.flight.state());
    Object.assign(this.focus, start);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD.width, WORLD.height);
    camera.startFollow(this.focus, false, 0.06, 0.06);
    camera.setZoom(this.scale.height / WORLD.height);
    camera.centerOn(start.x, start.y);
    this.scale.on('resize', (size: Phaser.Structs.Size) => camera.setSize(size.width, size.height));
    if (this.renderer.type === Phaser.WEBGL) {
      try {
        camera.filters.external.addVignette(0.5, 0.5, 1.1, 0.18);
      } catch {
        // A vignette is a nicety; the valley stays whole without it.
      }
    }
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const s = this.model.step(dt);
    const at = toWorld(s);
    this.unicorn.update(
      dt,
      at,
      s,
      this.model.wing,
      this.model.modeOf('unicorn'),
      this.model.mouthOf('unicorn'),
      this.reduced,
      this.model.asleep,
    );
    this.moon.update(
      dt,
      this.model.modeOf('moon-granny'),
      this.model.mouthOf('moon-granny'),
      this.reduced,
    );
    this.trail.emitting = Math.hypot(s.vx, s.vy) > 0.03;
    const camera = this.cameras.main;
    // The valley's height always fills the screen: a wide screen sees more of it, a tall phone a
    // slice that the camera carries along with the unicorn.
    const fit = this.scale.height / WORLD.height;
    for (const scene of this.model.takeScenes()) {
      // Arrival is long the first time (no name yet) and short every time after.
      const id =
        scene.id === 'arrival'
          ? this.model.nameOf()
            ? 'welcome-back'
            : 'first-meeting'
          : scene.id;
      if (id === 'to-crystal-river') this.model.flyToRiver();
      const from = { x: camera.midPoint.x, y: camera.midPoint.y, zoom: camera.zoom / fit };
      this.director.run(id, from, scene.done, at);
    }
    if (this.name.update(dt, this.model.nameOf(), this.started)) {
      const from = { x: camera.midPoint.x, y: camera.midPoint.y, zoom: camera.zoom / fit };
      this.director.run('name-in-stars', from, () => undefined);
    }
    this.started = true;
    const brushed = this.model.brushedToday();
    if (brushed !== this.brushed) {
      this.brushed = brushed;
      this.backdrop.river(brushed / 3);
    }
    if (this.director.active) {
      // A scene owns the camera: it goes exactly where the shot says.
      camera.setLerp(1, 1);
      Object.assign(this.focus, { x: this.director.view.x, y: this.director.view.y });
      camera.setZoom(fit * this.director.view.zoom);
    } else {
      camera.setLerp(0.06, 0.06);
      Object.assign(this.focus, at);
      const close = !s.moving && placeAt(s.x, s.y) === 'near-laila';
      const zoom = fit * (close ? 1.4 : 1);
      camera.setZoom(camera.zoom + (zoom - camera.zoom) * Math.min(1, dt * 2));
    }
    for (const moment of this.model.takeMoments()) this.moment(moment, at);
    for (const { layer, speed } of this.backdrop.clouds) {
      layer.x += speed * dt * (this.reduced ? 0.3 : 1);
      if (layer.x > WORLD.width + VIEW.width) layer.x = -160;
    }
    this.backdrop.depth.follow(camera.worldView);
  }

  private moment(moment: ValleyMoment, at: { x: number; y: number }) {
    if (moment.kind === 'wake') {
      this.burst.explode(this.reduced ? 8 : 20, at.x, at.y - 30);
      return;
    }
    if (moment.kind === 'sparkle') {
      const count = (moment.big ? 48 : 18) * (this.reduced ? 0.4 : 1);
      this.burst.explode(Math.round(count), at.x, at.y - 20);
      if (moment.big && !this.reduced) this.cameras.main.flash(260, 255, 240, 250);
      return;
    }
    this.tweens.add({
      targets: this.backdrop.stars,
      alpha: { from: 0.25, to: 1 },
      scale: { from: 1, to: this.reduced ? 1 : 1.8 },
      duration: 420,
      yoyo: true,
      repeat: 2,
      delay: this.tweens.stagger(25, {}),
    });
  }
}

/** Starts the valley inside parent; stop() frees the canvas and its GPU memory. */
export const startValley = (parent: HTMLElement, model: ValleyModel) =>
  startGame(parent, new ValleyScene(model), '#4a3a8c');
