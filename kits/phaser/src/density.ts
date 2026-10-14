/** Canvas pixels per CSS pixel: the screen's density, at most 2 to spare small devices. */
export const pixelDensity = () => Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
