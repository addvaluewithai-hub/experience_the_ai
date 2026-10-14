// Light parts only: nothing here loads Phaser, so a room's main code stays small. Scenes import
// `@experience/kit-phaser/game`, inside the module the room loads lazily.
export { Anchors, type WorldRect } from './anchors';
export { Cast } from './cast';
export { pixelDensity } from './density';
export { Director, type Shot, type Shots, type View } from './director';
export { PhaserFrame, type Starter } from './frame';
