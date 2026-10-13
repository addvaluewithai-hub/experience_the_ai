import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Flight, Wings, type FlightCommand, type FlightPath } from '../src/index.ts';

const move = (x: number, y: number, speed = 0.5, path: FlightPath = 'direct'): FlightCommand => ({
  action: 'move',
  x,
  y,
  speed,
  path,
});
const advance = (f: Flight, seconds: number, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) f.step(dt);
  return f.state();
};
const inside = (s: { x: number; y: number }) => s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1;

test('direct, arc and swoop arrive at bounded speed; arcs rise and swoops dip', () => {
  const middle: Record<string, number> = {};
  for (const path of ['direct', 'arc', 'swoop'] as const) {
    const f = new Flight();
    assert.equal(f.command(move(0.9, 0.62, 0.5, path)), true);
    let seconds = 0;
    let fastest = 0;
    while (f.state().moving && seconds < 20) {
      const before = f.state();
      const s = f.step(1 / 60);
      seconds += 1 / 60;
      fastest = Math.max(fastest, Math.hypot(s.vx, s.vy));
      assert.ok(inside(s));
      assert.ok(Math.hypot(s.x - before.x, s.y - before.y) < 0.007, 'no jumps');
      if (middle[path] === undefined && seconds > 1) middle[path] = s.y;
    }
    assert.ok(seconds < 20, `${path} arrives`);
    assert.ok(Math.abs(f.state().x - 0.9) < 0.003 && Math.abs(f.state().y - 0.62) < 0.003);
    assert.ok(fastest <= 0.231);
  }
  assert.ok(middle.arc < middle.direct - 0.02 && middle.swoop > middle.direct + 0.02);
  const slow = new Flight();
  const fast = new Flight();
  slow.command(move(1, 0, 0.1));
  fast.command(move(1, 0, 1));
  assert.ok(advance(fast, 1).y < advance(slow, 1).y - 0.02);
});

test('a new target keeps position and velocity; hover brakes; edges are never crossed', () => {
  const f = new Flight();
  f.command(move(1, 0, 1));
  const before = advance(f, 1.2);
  f.command(move(0, 1, 0.1, 'swoop'));
  assert.deepEqual(f.state(), before, 'a command alone moves nothing');
  const after = f.step(1 / 60);
  assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 0.008);
  assert.ok(Math.hypot(after.vx - before.vx, after.vy - before.vy) < 0.04);
  f.command({ action: 'hover' });
  const still = advance(f, 2);
  assert.equal(still.moving, false);
  assert.equal(still.landed, false);
  assert.ok(Math.hypot(still.vx, still.vy) < 0.001);
  for (let i = 0; i < 1600; i++) {
    if (i % 35 === 0) f.command(move(i % 70 ? 0 : 1, i % 105 ? 1 : 0, 0.7, 'arc'));
    const s = f.step(1 / 60);
    assert.ok(inside(s) && Number.isFinite(s.bank));
  }
});

test('landing folds the wings, takeoff is continuous, any frame rate and reduced motion work', () => {
  const after: { x: number }[] = [];
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    const f = new Flight();
    f.command({ action: 'land', x: 0.2 });
    const down = advance(f, 20, dt);
    assert.ok(down.y > 0.997 && down.landed && down.lift < 0.001);
    f.command(move(0.8, 0.1, 0.6, 'arc'));
    assert.equal(f.state().y, down.y);
    after.push(advance(f, 2, dt));
  }
  assert.ok(Math.abs(after[0].x - after[2].x) < 0.01);
  const calm = new Flight(undefined, { reducedMotion: true });
  calm.command(move(0.8, 0.1));
  const s = advance(calm, 25);
  assert.ok(!s.moving && Math.abs(s.x - 0.8) < 0.003 && s.bank === 0);
});

test('bad commands are refused; a hidden tab does not teleport', () => {
  const f = new Flight({ x: 0.1, y: 1 });
  assert.equal(f.state().landed, true);
  assert.equal(f.command(move(2, 0.5)), false);
  assert.equal(f.command(move(0.5, 0.5, 3)), false);
  assert.equal(f.command({ action: 'move', x: 0.5, y: 0.5, path: 'loop' as FlightPath }), false);
  assert.equal(f.state().moving, false);
  f.command(move(0.9, 0.2, 1));
  const s = f.step(30);
  assert.ok(Math.hypot(s.x - 0.1, s.y - 1) < 0.03);
});

test('wingbeats keep one continuous phase while the speed changes; folded on the ground', () => {
  const f = new Flight();
  const wings = new Wings();
  f.command(move(1, 0, 1));
  let previous = wings.step(1 / 60, f.state()).beat;
  for (let i = 0; i < 160; i++) {
    if (i === 90) f.command(move(0, 1, 0.1));
    const beat = wings.step(1 / 60, f.step(1 / 60)).beat;
    assert.ok(Math.abs(beat - previous) < 0.5, 'no jump in the wing');
    previous = beat;
  }
  const ground = new Flight({ x: 0.5, y: 1 });
  assert.equal(wings.step(1 / 60, ground.state()).open, 0);
});
