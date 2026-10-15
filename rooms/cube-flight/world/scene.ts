import * as Phaser from 'phaser';
import { startGame } from '@experience/kit-phaser/game';
import type { CubeModel } from './model';

/** A quiet desk behind the interactive number tiles; Zuzu is the moving focal point. */
class CubeScene extends Phaser.Scene {
  private body!: Phaser.GameObjects.Container;
  private frontWing!: Phaser.GameObjects.Graphics;
  private backWing!: Phaser.GameObjects.Graphics;
  private mouth!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Arc;
  private clock = 0;

  constructor(private model: CubeModel) {
    super('cube-flight');
  }

  create() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xeaf1ff, 0xeaf1ff, 0xfaf4ff, 0xfaf4ff);
    bg.fillRect(0, 0, 1100, 640);
    for (let i = 0; i < 15; i++) {
      const x = 45 + ((i * 211) % 1020);
      const y = 25 + ((i * 139) % 390);
      bg.fillStyle(i % 2 ? 0xb3afff : 0xffffff, 0.45);
      bg.fillCircle(x, y, (i % 3) + 3);
    }
    this.add
      .ellipse(550, 585, 880, 88, 0xdcdaf9, 0.18)
      .setStrokeStyle(2, 0xbeb9ed, 0.12);

    const g = () => this.add.graphics();
    this.backWing = g();
    this.backWing.fillStyle(0xbdb5ff);
    this.backWing.fillEllipse(-46, -16, 55, 78);
    const tail = g();
    tail.fillStyle(0x8175e7);
    tail.fillEllipse(48, 13, 30, 17);
    const body = g();
    body.fillStyle(0xfaf7ff);
    body.fillEllipse(0, 0, 122, 88);
    body.lineStyle(3, 0x9b90ed, 0.75);
    body.strokeEllipse(0, 0, 122, 88);
    body.fillStyle(0xffd5e2);
    body.fillCircle(-27, 13, 12);
    body.fillCircle(28, 13, 12);
    const eyes = g();
    eyes.fillStyle(0x332f62);
    eyes.fillCircle(-23, -6, 6);
    eyes.fillCircle(23, -6, 6);
    eyes.fillStyle(0xffffff);
    eyes.fillCircle(-21, -8, 2);
    eyes.fillCircle(25, -8, 2);
    this.mouth = g();
    this.mouth.fillStyle(0x7669c7);
    this.mouth.fillEllipse(0, 25, 12, 10);
    this.frontWing = g();
    this.frontWing.fillStyle(0xd9d3ff);
    this.frontWing.fillEllipse(44, -19, 50, 75);
    this.glow = this.add.circle(0, 0, 82, 0xc2b8ff, 0.12);
    this.body = this.add.container(550, 125, [
      this.backWing,
      tail,
      body,
      eyes,
      this.mouth,
      this.frontWing,
    ]);
    this.size();
    this.scale.on('resize', () => this.size());
  }

  private size() {
    const camera = this.cameras.main;
    const zoom = Math.min(this.scale.width / 1100, this.scale.height / 640);
    camera.setZoom(zoom).centerOn(550, 320);
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(0.1, deltaMs / 1000);
    this.clock += dt;
    const s = this.model.step(dt);
    const x = 170 + s.x * 760;
    const y = 57 + s.y * 260;
    const bob = this.model.reduced ? 0 : Math.sin(this.clock * 2.7) * 5;
    this.body.setPosition(x, y + bob);
    this.body.setRotation((s.bank * Math.PI) / 300);
    this.frontWing.setRotation(this.model.wing.beat * 0.5);
    this.backWing.setRotation(-this.model.wing.beat * 0.5);
    this.mouth.setScale(1, 0.4 + (this.model.mouthOf('zuzu')?.open ?? 0) * 1.4);
    this.glow.setPosition(x, y + bob);
    for (const moment of this.model.takeMoments()) {
      if (this.model.reduced) continue;
      const color = moment === 'cheer' ? 0xf9bb64 : 0xb8a8f1;
      for (let i = 0; i < (moment === 'cheer' ? 11 : 4); i++) {
        const angle = (i * Math.PI * 2) / (moment === 'cheer' ? 11 : 4);
        const star = this.add.circle(x, y, 3 + (i % 3), color);
        this.tweens.add({
          targets: star,
          x: x + Math.cos(angle) * 120,
          y: y + Math.sin(angle) * 80,
          alpha: 0,
          scale: 0,
          duration: 550,
          onComplete: () => star.destroy(),
        });
      }
    }
  }
}

export const startCubeFlight = (parent: HTMLElement, model: CubeModel) =>
  startGame(parent, new CubeScene(model), '#eaf1ff');
