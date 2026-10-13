/**
 * The stage's 2.5D space: x 0–1 across, depth 0 (front) to 1 (back), height 0 (floor) to 1
 * (top of the sky). One function maps it to the 1000 × 640 view, so rigs, props and hit
 * areas all agree, and depth sorting and perspective scale come from the same place.
 */
export const VIEW = { width: 1000, height: 640, horizon: 330, front: 615 } as const;
/** Stage units to view pixels at the front edge: an adult stands about 250 px tall there. */
const UNIT = 1.35;

export type Point = { x: number; depth: number; height?: number };
export type Projected = { sx: number; sy: number; scale: number; z: number };

export function project({ x, depth, height = 0 }: Point): Projected {
  const near = 1 - depth;
  const scale = (0.6 + 0.4 * near) * UNIT;
  const width = VIEW.width * (0.66 + 0.3 * near);
  const floorY = VIEW.horizon + (VIEW.front - VIEW.horizon) * near;
  return {
    sx: VIEW.width / 2 + (x - 0.5) * width,
    sy: floorY - height * (floorY - 50),
    scale,
    // Paint back to front; things in the air paint over the floor at the same depth.
    z: near * 1000 + height * 10,
  };
}

export const clamp = (v: number, low = 0, high = 1) => Math.max(low, Math.min(high, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
