/**
 * Bounded flight for any winged character, on any surface (Phaser, canvas, SVG, 3D).
 * Space is normalised: x 0 = left, 1 = right; y 0 = the upper flight limit, 1 = the ground.
 * The surface maps that box to its own world and keeps its own clock; this only moves.
 * Learned from pixilive's flight.js: position and velocity survive every retarget, travel
 * accelerates and brakes, turns bank, and a hidden tab never teleports.
 */
export type FlightPath = 'direct' | 'arc' | 'swoop';
export type FlightCommand =
  | { action: 'move'; x: number; y: number; speed?: number; path?: FlightPath }
  | { action: 'land'; x?: number; speed?: number; path?: FlightPath }
  | { action: 'hover' };
export type FlightState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Lean into the turn, in degrees (-12 to 12); 0 with reduced motion. */
  bank: number;
  /** 1 in the air, 0 settled on the ground; eases between. */
  lift: number;
  moving: boolean;
  landed: boolean;
};
export const FLIGHT_PATHS: readonly FlightPath[] = ['direct', 'arc', 'swoop'];

type Point = { x: number; y: number };
type Route = { start: Point; mid: Point; end: Point; t: number; duration: number; speed: number };

const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const unit = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
/** Top speed in box widths per second for a requested speed 0.1–1. */
const cruise = (speed: number) => 0.08 + speed * 0.3;
const CURVE = 0.38;
const MAX_ACCELERATION = 0.9;
const SUBSTEP = 1 / 120;

export class Flight {
  private s: FlightState;
  private route: (Route & { land: boolean }) | null = null;
  private braking = false;

  constructor(
    start: Point = { x: 0.5, y: 0.62 },
    private readonly options: { reducedMotion?: boolean } = {},
  ) {
    const landed = start.y >= 1;
    this.s = {
      x: clamp(start.x),
      y: clamp(start.y),
      vx: 0,
      vy: 0,
      bank: 0,
      lift: landed ? 0 : 1,
      moving: false,
      landed,
    };
  }

  /** Starts a new route from where the character is now; false when the command is invalid. */
  command(c: FlightCommand): boolean {
    if (c.action === 'hover') {
      this.route = null;
      this.braking = true;
      this.s.moving = true;
      return true;
    }
    const speed = c.speed ?? 0.5;
    const path = c.path ?? 'direct';
    if (!Number.isFinite(speed) || speed < 0.1 || speed > 1 || !FLIGHT_PATHS.includes(path))
      return false;
    const end = c.action === 'land' ? { x: c.x ?? 0.5, y: 1 } : { x: c.x, y: c.y };
    if (!unit(end.x) || !unit(end.y)) return false;
    const bend = path === 'arc' ? -CURVE : path === 'swoop' ? CURVE : 0;
    const mid = { x: (this.s.x + end.x) / 2, y: clamp((this.s.y + end.y) / 2 + bend) };
    const length =
      Math.hypot(mid.x - this.s.x, mid.y - this.s.y) + Math.hypot(end.x - mid.x, end.y - mid.y);
    this.route = {
      start: { x: this.s.x, y: this.s.y },
      mid,
      end,
      t: 0,
      duration: Math.max(0.65, length / cruise(speed)),
      speed: cruise(speed),
      land: c.action === 'land',
    };
    this.braking = false;
    this.s.moving = true;
    if (c.action !== 'land' || Math.hypot(end.x - this.s.x, end.y - this.s.y) > 0.002)
      this.s.landed = false;
    return true;
  }

  /** Advances by dt seconds (capped at 0.1 s, in small substeps) and returns the state. */
  step(dt: number): FlightState {
    if (!Number.isFinite(dt) || dt <= 0) return this.state();
    let remaining = Math.min(dt, 0.1);
    while (remaining > 1e-7) {
      const h = Math.min(remaining, SUBSTEP);
      remaining -= h;
      this.substep(h);
    }
    return this.state();
  }

  state(): FlightState {
    return { ...this.s };
  }

  private substep(h: number) {
    const s = this.s;
    const reduced = Boolean(this.options.reducedMotion);
    const route = this.route;
    if (route) {
      route.t = Math.min(1, route.t + h / route.duration);
      const t = route.t * route.t * (3 - 2 * route.t);
      const u = 1 - t;
      const target = {
        x: u * u * route.start.x + 2 * u * t * route.mid.x + t * t * route.end.x,
        y: u * u * route.start.y + 2 * u * t * route.mid.y + t * t * route.end.y,
      };
      // Chase the moving target like a spring, with a capped acceleration.
      const before = Math.hypot(s.vx, s.vy);
      const ax = (target.x - s.x) * 36 - 12 * s.vx;
      const ay = (target.y - s.y) * 36 - 12 * s.vy;
      const scale = Math.min(1, MAX_ACCELERATION / Math.max(Math.hypot(ax, ay), 1e-9));
      s.vx += ax * scale * h;
      s.vy += ay * scale * h;
      // A lower speed decelerates gradually instead of snapping.
      const v = Math.hypot(s.vx, s.vy);
      const limit = Math.max(route.speed * (reduced ? 0.65 : 1), before - 0.8 * h);
      if (v > limit) {
        s.vx *= limit / v;
        s.vy *= limit / v;
      }
      const arrived = Math.hypot(s.x - route.end.x, s.y - route.end.y) < 0.001;
      if (route.t === 1 && arrived && Math.hypot(s.vx, s.vy) < 0.004) {
        s.landed = route.land;
        this.route = null;
        this.braking = true;
      }
    } else {
      const decay = Math.exp(-h * 9);
      s.vx *= decay;
      s.vy *= decay;
    }
    s.vx = this.brakeBefore(s.x, s.vx, h);
    s.vy = this.brakeBefore(s.y, s.vy, h);
    s.x = clamp(s.x + s.vx * h);
    s.y = clamp(s.y + s.vy * h);
    if (this.braking && Math.hypot(s.vx, s.vy) < 0.001) {
      s.moving = false;
      this.braking = false;
    }
    const bank = reduced ? 0 : clamp(s.vx * 55, -12, 12);
    s.bank += (bank - s.bank) * (1 - Math.exp(-h * 7));
    s.lift += ((s.landed ? 0 : 1) - s.lift) * (1 - Math.exp(-h * 5));
  }

  /** Brakes ahead of an edge so even a sharp reversal never crosses it. */
  private brakeBefore(at: number, v: number, h: number) {
    const room = Math.max(0, v > 0 ? 1 - at : at);
    return Math.sign(v) * Math.min(Math.abs(v), Math.sqrt(2 * MAX_ACCELERATION * room), room / h);
  }
}
