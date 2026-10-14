import type * as Phaser from 'phaser';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';

export type Gesture = 'wave' | 'point' | 'cheer' | 'think' | 'nod';
const SKIN = 0xd9a07c;
const HAIR = 0x3a2a22;
const CARDIGAN = 0x6f9c86;
const SHIRT = 0xf3ead8;
const PANTS = 0x3d4f6b;

type Arm = { upper: Phaser.GameObjects.Container; fore: Phaser.GameObjects.Container };
type Pose = { left: [number, number]; right: [number, number] };
const REST: Pose = { left: [0.12, 0.1], right: [-0.12, -0.1] };

/** Noor, drawn from shapes: she walks, gestures, looks at who speaks, and speaks with her lips. */
export class Noor {
  readonly body: Phaser.GameObjects.Container;
  private legs: Phaser.GameObjects.Container[] = [];
  private arms: { left: Arm; right: Arm };
  private head: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private time = 0;
  private blink = 2;
  private stride = 0;

  constructor(private scene: Phaser.Scene) {
    const add = scene.add;
    const leg = (x: number) => {
      const g = add.graphics();
      g.fillStyle(PANTS, 1).fillRoundedRect(-17, 0, 34, 140, 12);
      g.fillStyle(0x2b2b2b, 1).fillEllipse(0, 146, 44, 18);
      const c = add.container(x, -150, [g]);
      this.legs.push(c);
      return c;
    };
    const torso = add.graphics();
    torso.fillStyle(CARDIGAN, 1).fillRoundedRect(-56, -292, 112, 156, 26);
    torso.fillStyle(SHIRT, 1).fillTriangle(-22, -292, 22, -292, 0, -236);
    torso.fillStyle(SKIN, 1).fillRect(-11, -312, 22, 24);
    const arm = (side: 1 | -1): Arm => {
      const foreG = add.graphics();
      foreG.fillStyle(CARDIGAN, 1).fillRoundedRect(-12, 0, 24, 66, 11);
      foreG.fillStyle(SKIN, 1).fillCircle(0, 74, 13);
      const fore = add.container(0, 74, [foreG]);
      const upperG = add.graphics().fillStyle(CARDIGAN, 1).fillRoundedRect(-13, -4, 26, 82, 12);
      const upper = add.container(side * 52, -278, [upperG, fore]);
      return { upper, fore };
    };
    this.arms = { left: arm(-1), right: arm(1) };
    const face = add.graphics();
    face.fillStyle(HAIR, 1).fillEllipse(0, -6, 82, 92).fillCircle(-8, -56, 22);
    face.fillStyle(SKIN, 1).fillEllipse(0, 4, 64, 78);
    face.fillStyle(HAIR, 1).fillEllipse(-14, -28, 46, 22).fillEllipse(16, -32, 34, 16);
    face.fillStyle(0xe58f8a, 0.45).fillCircle(-18, 16, 7).fillCircle(18, 16, 7);
    face.lineStyle(2, 0x9a6447, 1).lineBetween(0, 2, -3, 14).lineBetween(-3, 14, 2, 15);
    face.lineStyle(3, HAIR, 1).lineBetween(-22, -12, -8, -14).lineBetween(8, -14, 22, -12);
    this.eyes = add.graphics();
    this.mouth = add.graphics().setPosition(0, 26);
    this.head = add.container(0, -350, [face, this.eyes, this.mouth]);
    this.body = add.container(0, 0, [
      leg(-20),
      leg(20),
      this.arms.left.upper,
      torso,
      this.arms.right.upper,
      this.head,
    ]);
    this.body.setScale(0.92);
  }

  /** Poses her for this frame: where she stands, how she moves, what she does, what is heard. */
  update(
    dt: number,
    at: { x: number; y: number },
    walking: number,
    gesture: Gesture | null,
    mode: PresenceMode,
    mouth: MouthFrame | null,
    reduced: boolean,
  ) {
    this.time += dt;
    this.stride += dt * 7 * walking;
    const swing = Math.sin(this.stride) * 0.35 * walking;
    const bob = reduced
      ? 0
      : Math.abs(Math.sin(this.stride)) * 6 * walking + Math.sin(this.time * 1.6) * 1.5;
    this.body.setPosition(at.x, at.y - bob);
    this.legs[0].setRotation(swing);
    this.legs[1].setRotation(-swing);
    const pose = this.pose(gesture);
    const ease = Math.min(1, dt * 8);
    for (const side of ['left', 'right'] as const) {
      const arm = this.arms[side];
      const [up, fore] = pose[side];
      const walk = side === 'left' ? -swing * 0.6 : swing * 0.6;
      arm.upper.rotation += (up + walk - arm.upper.rotation) * ease;
      arm.fore.rotation += (fore - arm.fore.rotation) * ease;
    }
    const tilt =
      mode === 'listening'
        ? 0.08
        : mode === 'thinking'
          ? -0.1
          : mode === 'speaking'
            ? Math.sin(this.time * 6) * 0.04
            : 0;
    const nod = gesture === 'nod' ? Math.sin(this.time * 9) * 0.12 : 0;
    this.head.rotation += (tilt + nod - this.head.rotation) * ease;
    this.blink -= dt;
    if (this.blink < 0) this.blink = 2.4 + Math.random() * 3;
    const shut = this.blink < 0.12 ? 0.15 : 1;
    this.eyes
      .clear()
      .fillStyle(0x2a1d17, 1)
      .fillEllipse(-15, -4, 8, 10 * shut)
      .fillEllipse(15, -4, 8, 10 * shut);
    const open = mouth?.open ?? 0;
    this.mouth.clear();
    if (open < 0.06)
      this.mouth
        .lineStyle(2.5, 0x9b4a45, 1)
        .beginPath()
        .arc(0, -4, 9, 0.4, Math.PI - 0.4)
        .strokePath();
    else this.mouth.fillStyle(0x8f3d3a, 1).fillEllipse(0, 0, 18 - open * 4, 3 + open * 14);
  }

  /** Arm angles (shoulder, elbow) for a gesture; a wave moves its forearm. */
  private pose(gesture: Gesture | null): Pose {
    const wave = Math.sin(this.time * 10) * 0.45;
    switch (gesture) {
      case 'wave':
        return { left: REST.left, right: [-2.6, 0.2 + wave] };
      case 'point':
        return { left: REST.left, right: [-1.55, -0.1] };
      case 'cheer':
        return { left: [2.7, -0.3], right: [-2.7, 0.3] };
      case 'think':
        return { left: REST.left, right: [-0.5, -2.4] };
      default:
        return REST;
    }
  }
}
