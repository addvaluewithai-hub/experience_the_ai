import type * as Phaser from 'phaser';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';
import type { Depth } from './backdrop';
import { drawMouth } from './draw';

/** Grandma Moon: a warm face in the sky that glows brighter while she tells the story. */
export class Moon {
  private glow: Phaser.GameObjects.Arc;
  private mouth: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(scene: Phaser.Scene, depth: Depth, x: number, y: number) {
    this.glow = depth.add(scene.add.circle(x, y, 70, 0xfff3c4, 0.18), 0.2);
    const face = depth.add(scene.add.graphics(), 0.2);
    face.fillStyle(0xfff7d6, 1);
    face.fillCircle(x, y, 40);
    face.fillStyle(0xf3e3b0, 1);
    face.fillCircle(x - 16, y - 18, 6);
    face.fillCircle(x + 20, y + 14, 4);
    face.lineStyle(2.5, 0x8a6d3b, 1);
    for (const dx of [-13, 13]) {
      face.beginPath();
      face.arc(x + dx, y - 4, 6, 0.2, Math.PI - 0.2);
      face.strokePath();
    }
    face.fillStyle(0xf9a8d4, 0.55);
    face.fillCircle(x - 22, y + 8, 6);
    face.fillCircle(x + 22, y + 8, 6);
    this.mouth = depth.add(scene.add.graphics().setPosition(x, y + 14), 0.2);
  }

  update(dt: number, mode: PresenceMode, mouth: MouthFrame | null, reduced: boolean) {
    this.time += dt;
    const speaking = mode === 'speaking';
    const breathe = reduced ? 0 : Math.sin(this.time * (speaking ? 3 : 1.2)) * 0.04;
    const target = (speaking ? 1.35 : 1) + breathe;
    this.glow.setScale(this.glow.scale + (target - this.glow.scale) * Math.min(1, dt * 4));
    this.glow.setAlpha(speaking ? 0.32 : 0.18);
    drawMouth(this.mouth, mouth?.open ?? 0, 14, 0x8a6d3b);
  }
}
