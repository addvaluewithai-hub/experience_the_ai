import type * as Phaser from 'phaser';

/** Where the camera looks: a point in the valley and a zoom over the fit-to-height zoom. */
type View = { x: number; y: number; zoom: number };
type Shot = View & { seconds: number; hold?: number; ease?: string };

/**
 * The valley's named shots. While one plays it owns the camera; when it ends the camera
 * follows the unicorn again. Shots are slower and fewer with reduced motion.
 */
export const SHOTS: Record<string, (reduced: boolean) => Shot[]> = {
  // Long, the first time: the sky, the sleeping river, the bridge, down to the unicorn.
  'first-meeting': (reduced) =>
    reduced
      ? [
          { x: 960, y: 200, zoom: 1, seconds: 0, hold: 0.6 },
          { x: 960, y: 430, zoom: 1.4, seconds: 1.6, hold: 0.6 },
        ]
      : [
          { x: 820, y: 120, zoom: 1.7, seconds: 0, hold: 1 },
          { x: 420, y: 440, zoom: 1.35, seconds: 2.4 },
          { x: 1490, y: 330, zoom: 1.25, seconds: 2.8, hold: 0.3 },
          { x: 960, y: 440, zoom: 1.55, seconds: 2.4, hold: 0.8 },
          { x: 960, y: 400, zoom: 1, seconds: 1 },
        ],
  // Short, every time after: a push in to the sleeping unicorn.
  'welcome-back': (reduced) => [
    { x: 960, y: 300, zoom: 1, seconds: 0, hold: reduced ? 0.2 : 0.5 },
    { x: 960, y: 440, zoom: 1.35, seconds: reduced ? 0.8 : 1.6, hold: 0.5 },
    { x: 960, y: 400, zoom: 1, seconds: 0.8 },
  ],
  // Tilt up to the name written in the stars, hold, come back down.
  'name-in-stars': (reduced) => [
    { x: 960, y: 170, zoom: 1.3, seconds: reduced ? 0.8 : 1.4, hold: reduced ? 2 : 2.6 },
  ],
  // The whole valley, left to right, for a story or a new place.
  'valley-tour': (reduced) =>
    reduced
      ? [{ x: 960, y: 310, zoom: 1, seconds: 1.2, hold: 2 }]
      : [
          { x: 300, y: 380, zoom: 1.2, seconds: 1.6, hold: 0.4 },
          { x: 960, y: 300, zoom: 1, seconds: 2.4 },
          { x: 1560, y: 300, zoom: 1.2, seconds: 2.4, hold: 0.4 },
          { x: 1190, y: 140, zoom: 1.4, seconds: 2, hold: 0.8 },
        ],
};

export class Director {
  readonly view: View = { x: 0, y: 0, zoom: 1 };
  active = false;
  private chain?: Phaser.Tweens.TweenChain;
  private pending?: () => void;

  constructor(
    private scene: Phaser.Scene,
    private reduced: boolean,
  ) {}

  /** Plays a shot list from where the camera is now; calls done when it is over. */
  run(name: string, from: View, done: () => void) {
    // A new scene cuts the one playing; whoever waited on it is told it is over.
    this.chain?.stop();
    this.pending?.();
    const shots = SHOTS[name]?.(this.reduced) ?? [];
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
