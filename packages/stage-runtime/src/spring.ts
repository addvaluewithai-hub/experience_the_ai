/**
 * A critically damped spring: retargeting keeps position and velocity, so a new command never
 * snaps a limb. Fixed small steps keep motion the same at 30, 60 or 120 Hz.
 */
export class Spring {
  velocity = 0;
  constructor(
    public value: number,
    public target = value,
    /** Roughly "how fast it settles": higher is snappier. */
    public speed = 10,
  ) {}

  step(dt: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    const k = this.speed * this.speed;
    const c = 2 * this.speed;
    for (let i = 0; i < steps; i++) {
      const accel = k * (this.target - this.value) - c * this.velocity;
      this.velocity += accel * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  snap(value: number) {
    this.value = this.target = value;
    this.velocity = 0;
  }
}
