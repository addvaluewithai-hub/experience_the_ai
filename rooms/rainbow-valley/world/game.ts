import * as Phaser from 'phaser';

const FALLBACK = { width: 960, height: 540 };

/**
 * Runs one scene inside parent, drawn at the screen's real pixel density (up to 2x) so it
 * stays sharp, and following the parent's size. stop() frees the canvas and its GPU memory.
 */
export function startGame(parent: HTMLElement, scene: Phaser.Scene, background: string) {
  const density = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
  const size = () => ({
    width: Math.round((parent.clientWidth || FALLBACK.width) * density),
    height: Math.round((parent.clientHeight || FALLBACK.height) * density),
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    ...size(),
    backgroundColor: background,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / density },
    scene,
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
