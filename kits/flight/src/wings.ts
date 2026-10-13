import type { FlightState } from './flight';

export type WingFrame = {
  /** 0–1 around one beat; keeps running smoothly when the speed changes. */
  phase: number;
  /** -1 (down) to 1 (up), already scaled by how open the wings are. */
  beat: number;
  /** 0 folded on the ground to 1 fully open in the air. */
  open: number;
};

/**
 * Wingbeats for a flying character. The phase only ever advances, so a change of speed
 * changes the tempo, never jumps the wing. A surface draws the wings from the frame.
 */
export class Wings {
  private phase = 0;

  constructor(private readonly options: { reducedMotion?: boolean } = {}) {}

  step(dt: number, flight: FlightState): WingFrame {
    const speed = Math.hypot(flight.vx, flight.vy);
    const calm = this.options.reducedMotion ? 0.5 : 1;
    // About 1.6 beats a second while hovering, up to about 4 at full speed.
    const tempo = (1.6 + Math.min(1, speed / 0.38) * 2.4) * calm * (0.25 + 0.75 * flight.lift);
    if (Number.isFinite(dt) && dt > 0) this.phase = (this.phase + Math.min(dt, 0.1) * tempo) % 1;
    const open = Math.max(0, Math.min(1, flight.lift));
    return { phase: this.phase, beat: Math.sin(this.phase * 2 * Math.PI) * open, open };
  }
}
