# Stages: worlds that characters understand (engine design)

Status: design, not built. Companion to docs/characters.md (what a character is); this file is
where characters live and how they move, alone or together, scripted or free.

References, not dependencies: pixilive `feat/character-engine` @ `ee91c77f` (bounded flight,
semantic tools, one clock), englishlive @ `e57553b2` (stage director), kidshabits @ `c1ab8ce`
(locations as kits, named anchors and camera shots, stateful world objects, authored sequence
director, performance priority, "state decides what is true, the world shows it").

## The idea in one line

A stage tells the AI **what places mean**, not where pixels are. The character says "go eat"
or "fly to the moon"; the engine knows where the bowl and the moon are, how this character
travels there, and what eating looks like.

## A stage is data

```json
{
  "kind": "stage",
  "scene": "space",
  "places": [
    {
      "id": "earth",
      "x": 0.18,
      "depth": 0.7,
      "label": "الأرض",
      "means": "home base, where trips start and end"
    },
    {
      "id": "moon",
      "x": 0.82,
      "depth": 0.2,
      "label": "القمر",
      "means": "the first trip; quiet, a good place to rest"
    },
    {
      "id": "rocket-pad",
      "x": 0.25,
      "depth": 0.75,
      "label": "منصة الصاروخ",
      "affords": ["launch", "land"]
    }
  ],
  "props": [
    { "id": "rocket", "prop": "rocket", "at": "rocket-pad", "states": ["parked", "flying"] }
  ],
  "routes": [{ "id": "first-trip", "through": ["earth", "moon"], "means": "the trip of the week" }],
  "routines": ["launch", "orbit", "wave-from-window"],
  "cast": [{ "character": "zeezo", "at": "earth", "pose": "stand" }],
  "shots": {
    "wide": { "focus": "earth", "zoom": 1 },
    "moon-close": { "focus": "moon", "zoom": 1.6 }
  }
}
```

- **Places** are named anchors with a label and a meaning in the room's language. Each may
  list **affordances**: what can be done there (eat, drink, sleep, sit, read, launch, swim,
  present). Characters and props attach to places, never to raw coordinates.
- **Props** come from a shared kit (bowl, water dish, bed, desk, chair, board, rocket,
  planet, tree, door…) and have **states** (bowl full/empty, rocket parked/flying, flower
  closed/open). A prop state can be bound to room data, so the world shows what is true:
  `{ "state": "full", "when": { "collection": "meals", "today": true } }`.
- **Routes** are named paths through places (a journey, a race track, an orbit).
- **Routines** are scripted moves from a shared library, parameterised by places.
- **Shots** are named camera framings, so nothing refers to pixels.
- x 0–1 across, depth 0 front to 1 back; the stage keeps safe bounds, sorts by depth and
  scales by perspective. Mobile portrait first.

## How characters move: three ways, one engine

| Way            | Who decides                        | Example                                               |
| -------------- | ---------------------------------- | ----------------------------------------------------- |
| **Sequences**  | the room author, step by step      | the first meeting, a reveal, a lesson's opening       |
| **Routines**   | the AI picks one, the engine plays | `eat` at the bowl, `orbit` the moon, `cheer` the kids |
| **Free moves** | the AI, within the stage's rules   | walk to the window, fly to "between the stars"        |

- **Locomotion** comes from the character's body plan: walk, run, hop, fly, swim, float,
  crawl. "Go to the moon" is a walk for nobody and a flight for a sprite; a pet without
  wings is told it cannot fly (capabilities travel with the tools, as in pixilive).
- **Free moves** use places first, then regions ("top", "near the window", "between earth
  and moon"), and only then normalised x/y/depth inside safe bounds. The engine plans the
  path (direct, arc, swoop, along a route), eases speed, banks flights, keeps velocity on
  retarget, and brakes on interruption.
- **Routines** are small authored choreographies the engine owns: `eat` = walk to a place
  that affords eating, lower head, chew loop, satisfied face, optionally flip the bowl to
  empty if the room allows. Room authors combine them; engine developers add new ones.
- **Sequences** are authored steps (kidshabits' director): camera shot, move, pose, gesture,
  expression, line, prop state, sound, effect, wait, parallel. They own cancellation.

Priority when they collide: authored sequence > safety/system > live AI request > idle life.
A live `celebrate` cannot hijack an authored reveal; an interruption stops voice and gesture
and turns flight into a hover, without touching saved state.

## What the AI knows and may do

Every turn the character's instruction carries a short **stage brief**, built by the engine:

```
Stage "space". You are زيزو (a sprite: you can walk, hop and fly).
You are at: earth (home base). The rocket is parked on the rocket pad.
Places: earth (home base, trips start here); moon (the first trip; quiet); rocket-pad (launch, land).
Route first-trip: earth → moon. Routines you can play: launch, orbit, wave-from-window.
Others here: none.
```

Tools (semantic, non-blocking, acknowledged silently, as in pixilive and englishlive):

- `perform({ expression, gesture, intensity, duration, timing })`
- `go_to({ place | region | x, y, depth, how: walk|run|hop|fly|swim, path, speed })`
- `follow_route({ route, speed })`, `stop()`
- `play_routine({ routine, at?: place, with?: character })`
- `look_at({ place | character | "person" })`, `set_pose({ pose, at?: place })`
- `show({ shot })` when the room lets characters move the camera

Never available to the AI: changing the room's progress or truth (completing a habit,
unlocking a room, choosing what happens next). Those stay data tools with their rules, or
the room's own logic. The AI sees only places, props and routes already revealed.

## Three worked examples

**Space trips (kids, planet theme).** Places earth, moon, mars; route weekly-trip; routines
launch, orbit, land. Each done habit (room data) unlocks the next place; the sprite tells the
trip while flying the route, orbits the moon at a calm beat, lands on earth at the end.
The child sees the rocket parked or flying from the room's data, not from what the AI said.

**A pet that eats and drinks.** Places bowl (affords eat), water (drink), bed (sleep), rug
(play). The pet walks to the bowl and plays `eat` when the child says they fed it; the bowl
state is bound to today's feeding record, so if nobody fed it, the bowl stays empty whatever
the AI says. Idle life wanders between rug and bed.

**A cheerleader telling a journey to children.** Places start, river, mountain, finish along
route the-journey; three child characters seated on a rug, looking at the speaker. The
cheerleader walks the route as the story moves, plays `cheer` at each station, and turns to
the children (`look_at`) when asking them something; the children react with small gestures.
Only the speaker's mouth moves; voices take turns (docs/characters.md, several voices).

## Renderer

The stage, places, routines and tools are renderer-agnostic, like the character port.
Decision to make: an SVG/DOM stage first (reuses pixilive-style rigs and our parametric looks,
crisp, accessible, simplest) or Phaser 4 from the start (cameras, parallax, particles, many
actors; kidshabits' choice). Either sits behind the same `StagePort`; the room spec does not
change.

## Build order (after docs/characters.md steps 1–2)

1. Stage contract and validation: places, affordances, props and states with data bindings,
   routes, routines, shots, cast; stage brief text; tool declarations from the stage.
2. Locomotion and path planning (walk, hop, fly) with deterministic tests; routines `eat`,
   `drink`, `sleep`, `cheer`, `launch`, `orbit`.
3. Sequence player with priority and cancellation.
4. Live tools wired to the stage; scripted test conversations, then real-device checks.
