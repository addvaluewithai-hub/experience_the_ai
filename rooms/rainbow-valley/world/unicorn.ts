import type * as Phaser from 'phaser';
import type { FlightState, WingFrame } from '@experience/kit-flight';
import type { MouthFrame, PresenceMode } from '@experience/room-spec';
import { drawMouth, drawWing, fillShape } from './draw';

const WHITE = 0xfdfbff;
const SHADE = 0xe6ddf7;
const LINE = 0xb9a7e8;
const MANE = [0xf9a8d4, 0xc4b5fd, 0x93c5fd, 0xfbcfe8];

/** Laila's winged unicorn, drawn from shapes and moved every frame by the flight kit. */
export class Unicorn {
  readonly body: Phaser.GameObjects.Container;
  private wingFront: Phaser.GameObjects.Graphics;
  private wingBack: Phaser.GameObjects.Graphics;
  private head: Phaser.GameObjects.Container;
  private eye: Phaser.GameObjects.Graphics;
  private mouth: Phaser.GameObjects.Graphics;
  private legs: Phaser.GameObjects.Graphics[] = [];
  private facing = 1;
  private time = 0;
  private blink = 3;

  constructor(scene: Phaser.Scene) {
    const add = scene.add;
    const g = () => add.graphics();
    const tail = g();
    MANE.forEach((c, i) => {
      tail.fillStyle(c, 1);
      tail.fillEllipse(-64 - i * 6, -6 + i * 9, 34, 14);
    });
    this.wingBack = g();
    drawWing(this.wingBack, 0.85, 0xd9c8ff, LINE);
    this.wingBack.setPosition(-8, -26);
    const leg = (x: number, color: number) => {
      const l = g();
      l.fillStyle(color, 1);
      l.fillRoundedRect(-6, 0, 12, 40, 6);
      l.fillStyle(0xc4b5fd, 1);
      l.fillRoundedRect(-7, 32, 14, 8, 3);
      l.setPosition(x, 18);
      this.legs.push(l);
      return l;
    };
    const backLegs = [leg(-36, SHADE), leg(26, SHADE)];
    const torso = g();
    torso.fillStyle(WHITE, 1);
    torso.fillEllipse(0, 0, 118, 66);
    torso.lineStyle(2, LINE, 0.5);
    torso.strokeEllipse(0, 0, 118, 66);
    torso.fillStyle(0xfbcfe8, 0.5);
    torso.fillEllipse(-30, 6, 26, 14);
    const frontLegs = [leg(-24, WHITE), leg(38, WHITE)];
    this.head = this.makeHead(scene);
    this.eye = this.head.getAt(1) as Phaser.GameObjects.Graphics;
    this.mouth = this.head.getAt(2) as Phaser.GameObjects.Graphics;
    this.wingFront = g();
    drawWing(this.wingFront, 1, 0xeee6ff, LINE);
    this.wingFront.setPosition(-2, -28);
    this.body = add.container(0, 0, [
      tail,
      this.wingBack,
      ...backLegs,
      torso,
      ...frontLegs,
      this.head,
      this.wingFront,
    ]);
    this.body.setSize(200, 160);
  }

  private makeHead(scene: Phaser.Scene) {
    const g = scene.add.graphics();
    g.fillStyle(WHITE, 1);
    fillShape(g, [
      { x: -18, y: 18 },
      { x: 4, y: -16 },
      { x: 20, y: -6 },
      { x: 4, y: 30 },
    ]);
    g.fillEllipse(14, -22, 54, 42);
    g.fillStyle(0xfff1f7, 1);
    g.fillEllipse(36, -10, 30, 24);
    g.fillStyle(0xf9a8d4, 0.55);
    g.fillCircle(22, -8, 6);
    g.fillStyle(0xfcd34d, 1);
    g.fillTriangle(6, -40, 20, -42, 22, -84);
    g.lineStyle(2, 0xf59e0b, 0.8);
    for (const y of [-52, -62, -72]) g.lineBetween(10 + (y + 40) * -0.25, y, 20, y + 3);
    g.fillStyle(SHADE, 1);
    g.fillTriangle(-6, -36, 4, -40, -2, -56);
    MANE.forEach((c, i) => {
      g.fillStyle(c, 1);
      g.fillCircle(-8 - i * 4, -38 + i * 14, 11);
    });
    const eye = scene.add.graphics();
    eye.setPosition(14, -26);
    eye.fillStyle(0x3b2e6e, 1);
    eye.fillEllipse(0, 0, 9, 12);
    eye.fillStyle(0xffffff, 1);
    eye.fillCircle(2, -3, 2);
    const mouth = scene.add.graphics();
    mouth.setPosition(40, -4);
    return scene.add.container(46, -30, [g, eye, mouth]);
  }

  /** Places and poses the unicorn for this frame. */
  update(
    dt: number,
    at: { x: number; y: number },
    flight: FlightState,
    wing: WingFrame,
    mode: PresenceMode,
    mouth: MouthFrame | null,
    reduced: boolean,
  ) {
    this.time += dt;
    const lift = flight.lift;
    const bob = reduced ? 0 : Math.sin(this.time * 2.2) * 5 * lift;
    this.body.setPosition(at.x, at.y + bob);
    if (Math.abs(flight.vx) > 0.01) this.facing = flight.vx > 0 ? 1 : -1;
    const turn = this.body.scaleX + (this.facing * 0.85 - this.body.scaleX) * Math.min(1, dt * 8);
    this.body.setScale(Math.abs(turn) < 0.08 ? 0.08 * this.facing : turn, 0.85);
    const tilt = (flight.bank * Math.PI) / 180 + (reduced ? 0 : flight.vy * 1.4);
    this.body.setRotation(tilt * 0.6 * Math.sign(this.body.scaleX));
    const flap = wing.beat * 0.55;
    this.wingFront.setRotation(-0.15 + flap - (1 - wing.open) * 0.6);
    this.wingBack.setRotation(-0.05 + flap * 0.8 - (1 - wing.open) * 0.6);
    this.legs.forEach((leg, i) => leg.setRotation((i % 2 ? -0.9 : 0.9) * lift * (i < 2 ? 1 : 0.8)));
    const nod =
      mode === 'speaking'
        ? Math.sin(this.time * 7) * 0.05
        : mode === 'listening'
          ? 0.12
          : mode === 'thinking'
            ? -0.12
            : 0;
    this.head.setRotation(this.head.rotation + (nod - this.head.rotation) * Math.min(1, dt * 6));
    this.blink -= dt;
    if (this.blink < 0) this.blink = 2.5 + Math.random() * 3;
    this.eye.setScale(1, this.blink < 0.12 ? 0.15 : 1);
    drawMouth(this.mouth, mouth?.open ?? 0, 12, 0x6b4e9b);
  }
}
