import * as Phaser from 'phaser';
import type { FlightState } from '@experience/kit-flight';
import { drawBackdrop, VIEW, WORLD, type Backdrop } from './backdrop';
import type { ValleyModel, ValleyMoment } from './model';
import { Moon } from './moon';
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
    );
    this.moon.update(
      dt,
      this.model.modeOf('moon-granny'),
      this.model.mouthOf('moon-granny'),
      this.reduced,
    );
    this.trail.emitting = Math.hypot(s.vx, s.vy) > 0.03;
    this.focus.x = at.x;
    this.focus.y = at.y;
    const close = !s.moving && placeAt(s.x, s.y) === 'near-laila';
    const camera = this.cameras.main;
    // The valley's height always fills the screen: a wide screen sees more of it, a tall phone a
    // slice that the camera carries along with the unicorn.
    const fit = this.scale.height / WORLD.height;
    const zoom = fit * (close ? 1.4 : 1);
    camera.setZoom(camera.zoom + (zoom - camera.zoom) * Math.min(1, dt * 2));
    for (const moment of this.model.takeMoments()) this.play(moment, at);
    for (const { layer, speed } of this.backdrop.clouds) {
      layer.x += speed * dt * (this.reduced ? 0.3 : 1);
      if (layer.x > WORLD.width + VIEW.width) layer.x = -160;
    }
    this.backdrop.depth.follow(camera.worldView);
  }

  private play(moment: ValleyMoment, at: { x: number; y: number }) {
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

/**
 * Starts the valley inside parent, drawn at the screen's real pixel density (up to 2x) so it
 * stays sharp; it follows the parent's size. stop() frees the canvas and its GPU memory.
 */
export function startValley(parent: HTMLElement, model: ValleyModel) {
  const density = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const size = () => ({
    width: Math.round((parent.clientWidth || VIEW.width) * density),
    height: Math.round((parent.clientHeight || VIEW.height) * density),
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    ...size(),
    backgroundColor: '#4a3a8c',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / density },
    scene: new ValleyScene(model),
  });
  const resized = new ResizeObserver(() => {
    const next = size();
    if (next.width && next.height) game.scale.resize(next.width, next.height);
  });
  resized.observe(parent);
  return {
    stop: () => {
      resized.disconnect();
      game.destroy(true);
    },
  };
}
