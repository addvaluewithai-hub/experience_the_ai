# Flight kit

Optional motion for any winged character, learned from pixilive's `flight.js`. It draws
nothing and knows no places: a room's surface (Phaser, canvas, SVG, 3D) maps its own places to
the normalised box and draws the character from the state.

```ts
import { Flight, Wings } from '@experience/kit-flight';

const flight = new Flight({ x: 0.5, y: 1 }, { reducedMotion }); // starts on the ground
const wings = new Wings({ reducedMotion });
flight.command({ action: 'move', x: 0.8, y: 0.2, speed: 0.6, path: 'arc' });
// every frame, on the surface's own clock:
const s = flight.step(dt); // x, y, vx, vy, bank (deg), lift (0 ground, 1 air), moving, landed
const w = wings.step(dt, s); // phase, beat (-1..1), open (0 folded, 1 open)
```

- Box: x 0 = left, 1 = right; y 0 = the upper flight limit, 1 = the ground. Leave room in the
  mapping for wings and gestures.
- `move` needs x and y; `land` takes x (default centre) and settles on the ground; `hover`
  brakes where the character is. `speed` 0.1–1 (default 0.5); `path` `direct`, `arc` (curves
  up) or `swoop` (curves down). An invalid command returns false and changes nothing.
- A new command starts from the current position and velocity: no snapping. Lowering the
  speed decelerates. Braking before an edge means even a sharp reversal stays inside.
- `step` caps dt at 0.1 s, so a hidden tab never teleports; any frame rate gives the same path.
- Reduced motion: no banking, slower travel and calmer wings, same destinations.
- Wingbeat phase only advances, so changing speed changes the tempo, never jumps the wing.

In a room, declare the flying actions in the room's `world` (for example `fly_to` with the
room's own places as choices) and call `command` from the surface's `act`.
