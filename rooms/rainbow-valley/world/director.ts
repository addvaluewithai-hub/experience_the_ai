import type { Shots } from '@experience/kit-phaser';

/**
 * The valley's named shots. While one plays it owns the camera; when it ends the camera
 * follows the unicorn again. Shots are slower and fewer with reduced motion.
 */
export const SHOTS: Shots = {
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
  // Short, every time after: a push in to the unicorn, wherever she is.
  'welcome-back': (reduced, at) => [
    { x: at.x, y: 300, zoom: 1, seconds: 0, hold: reduced ? 0.2 : 0.5 },
    { x: at.x, y: at.y, zoom: 1.35, seconds: reduced ? 0.8 : 1.6, hold: 0.5 },
    { x: at.x, y: 400, zoom: 1, seconds: 0.8 },
  ],
  // Following her down into the crystal river: the camera dives to the water.
  'to-crystal-river': (reduced) => [
    {
      x: 420,
      y: 470,
      zoom: reduced ? 1.3 : 2.2,
      seconds: reduced ? 0.8 : 2.2,
      ease: 'Cubic.easeIn',
    },
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
