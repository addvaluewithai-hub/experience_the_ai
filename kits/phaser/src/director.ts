import type * as Phaser from 'phaser';

/** Where the camera looks: a point in the world and a zoom over the world's fit zoom. */
export type View = { x: number; y: number; zoom: number };
export type Shot = View & { seconds: number; hold?: number; ease?: string };
/** A world's named shots; each gets reduced motion and where its subject is now. */
export type Shots = Record<string, (reduced: boolean, at: { x: number; y: number }) => Shot[]>;

/**
 * Plays a world's named shots. While one plays it owns the camera (read `view` each frame);
 * when it ends the world's own camera rules take over again.
 */
export class Director {
  readonly view: View = { x: 0, y: 0, zoom: 1 };
  active = false;
  private chain?: Phaser.Tweens.TweenChain;
  private pending?: () => void;

  constructor(
    private scene: Phaser.Scene,
    private reduced: boolean,
    private shots: Shots,
  ) {}

  /** Plays a shot list from where the camera is now; calls done when it is over. */
  run(name: string, from: View, done: () => void, at = { x: from.x, y: from.y }) {
    // A new scene cuts the one playing; whoever waited on it is told it is over.
    this.chain?.stop();
    this.pending?.();
    const shots = this.shots[name]?.(this.reduced, at) ?? [];
    if (!shots.length) return done();
    Object.assign(this.view, from);
    this.active = true;
    const finish = () => {
      if (this.pending !== finish) return;
      this.pending = undefined;
      this.active = false;
      done();
    };
    this.pending = finish;
    // A first shot of zero seconds is a cut: start there and wait out its hold.
    let wait = 0;
    const [first] = shots;
    if (first.seconds === 0) {
      Object.assign(this.view, { x: first.x, y: first.y, zoom: first.zoom });
      wait = first.hold ?? 0;
    }
    const moves = shots.filter((shot) => shot.seconds > 0);
    if (!moves.length) {
      this.scene.time.delayedCall(wait * 1000, finish);
      return;
    }
    this.chain = this.scene.tweens.chain({
      tweens: moves.map(
        (shot, i): Phaser.Types.Tweens.TweenBuilderConfig => ({
          targets: this.view,
          x: shot.x,
          y: shot.y,
          zoom: shot.zoom,
          duration: shot.seconds * 1000,
          delay: i === 0 ? wait * 1000 : 0,
          hold: (shot.hold ?? 0) * 1000,
          ease: shot.ease ?? 'Sine.easeInOut',
        }),
      ),
      onComplete: finish,
    });
  }
}
