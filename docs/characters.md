# Characters and stages (engine design)

Status: design, not built. Goal: any character, in any theme, alone or with others on a 2.5D
stage (three students in a classroom, one sitting on a desk), each with real lip sync and
acting, described by a room as data. Rooms never draw characters; they describe them.

## What we learned (references, not dependencies)

- addvaluewithai-hub/pixilive `feat/character-engine` @ `ee91c77f`
- addvaluewithai-hub/englishlive (Englotti) `main` @ `e57553b2`

Keep these ideas:

1. **One port for every character.** pixilive's `CharacterPort` (expression, gesture, mouth,
   mode, cancel, destroy) and Englotti's renderer-agnostic `CharacterRenderer`: sessions,
   tools and lessons never know whether a character is SVG, Rive or 3D.
2. **Audio owns continuous motion; the AI adds semantic intent.** The model never sends
   coordinates, bones or visemes. It may call a non-blocking `perform` (expression, gesture,
   intensity, duration, timing) acknowledged with `scheduling: SILENT` as a sibling field.
3. **One clock.** PCM playback and mouth frames share `AudioContext.currentTime`; cues due
   "with speech" attach to the earliest audible audio; interruption clears sound, mouth and
   cues together. Speaking/listening state comes from what is audible, not from packets.
4. **Twelve visemes on one mouth topology** (REST, MBP, AA, EE, IH, OH, OO, FV, L, S, CH, WQ),
   driven by an acoustic analyzer: believable animation, never pronunciation evidence.
5. **Speech energy moves the body locally** (head, brows, small hand accents) with no model
   calls; explicit gestures win; reduced motion keeps speech and essential states only.
6. **Rigs are springs, not tweens:** retargeting keeps position and velocity, small fixed
   integration steps, cancellation eases back, disposal removes every loop and listener.
7. **Capabilities are told to the model** (Octo cannot fly; a switch updates the avatar in the
   next silent tool response, without a conversational turn).
8. **A stage director owns presentation** (Englotti's hero/board): the AI requests semantic
   support; the client decides layout and timing against audible speech.
9. **Vendoring discipline:** pin exact commits, compare blob hashes, copy only what changed.
10. **Deterministic tests** run the real rig against a DOM fixture; visual and live quality
    still needs eyes on real devices.

Do not repeat these limits:

- Each family is hand-drawn in fixed coordinates; a new anatomy is new geometry and a new rig
  (pixilive's README says so). Humans are four presets; mascots are one file pair each.
- One character per screen, always standing, always facing front.
- Engines are globals on `window` loaded by script order.

## The model: look, rig, stage, performance

### Look: any character as data

A character's look is a JSON recipe built from a **body plan** and **part kits**, never a
drawing. Body plans are few and each has its own rig; parts are many and shared.

| Body plan   | Examples                               | Pose support                  |
| ----------- | -------------------------------------- | ----------------------------- |
| `humanoid`  | students, teachers, CEO, kids, robots  | stand, sit, sit on desk, lean |
| `creature`  | fox, cat, bear, bunny, dragon (2 legs) | stand, sit, hop               |
| `blob`      | bean, ghost, slime, planet with a face | rest, squash, hop             |
| `tentacled` | octopus, jellyfish                     | rest, sit, float              |
| `winged`    | sprite, bird, fairy (any plan + wings) | adds fly                      |

Parts are slots with variants, all parameterized by proportions and palette:
head shape, ears, hair, brows, eyes (style, size, gap), nose, mouth (the shared viseme
topology, placed by anchors), cheeks, torso and outfit, arms/hands or tentacles, legs or
base, tail, wings, accessories (glasses, headset, scarf, bow, cap, backpack).
Every part declares **anchors** (eye line, mouth point, shoulders, hips, seat point, hand
tips) so the rig and stage never hard-code coordinates for a character.

```json
{
  "plan": "humanoid",
  "age": "child",
  "proportions": { "head": 1.15, "height": 0.8, "build": 0.9 },
  "palette": { "skin": "#f2b38f", "hair": "#3b2b26", "top": "#4f8cff", "bottom": "#2d3550" },
  "parts": {
    "hair": "curly-short",
    "eyes": "round",
    "top": "hoodie",
    "bottom": "jeans",
    "accessories": ["glasses", "backpack"]
  },
  "motion": { "energy": 0.6, "speechMotion": 0.45 }
}
```

A room character gets an optional `look`; without one the dock stays text. New looks are new
JSON; a new part variant or body plan is engine work with tests, available to every room.

### Rig: one per body plan, the same port for all

`CharacterPort` grows from pixilive's with what scenes need:
`expression`, `gesture`, `mouth`, `mode` (idle, listening, thinking, speaking),
**`pose`** (stand, sit, sit-on-desk, lean, rest; validated against the plan),
**`lookAt`** (a point or another character, so listeners turn to the speaker),
`cancel`, `destroy`, and optional `fly`. Shared geometry (mouth, limbs) is reused across
plans; each plan owns its idle, poses and gesture targets. Facing left/right is a mirror of
the same rig; depth is scale and order, not a new drawing.

### Stage: 2.5D scenes as data

A new panel kind `stage` holds a scene: a floor with perspective, a backdrop from the room's
theme, **props** from a shared kit (desk, chair, board, sofa, plant, door, window, rug,
screen), and **spots** where characters stand or sit. Props declare their own anchors (a
chair's seat point, a desk's top), so "sit on the desk" is the rig's `sit` pose placed at
the desk's top anchor.

```json
{
  "kind": "stage",
  "scene": "classroom",
  "props": [{ "id": "desk-1", "prop": "desk", "x": 0.3, "depth": 0.6 }],
  "cast": [
    { "character": "salma", "x": 0.3, "depth": 0.6, "pose": "sit-on-desk", "on": "desk-1" },
    { "character": "omar", "x": 0.6, "depth": 0.5, "pose": "sit", "facing": "left" },
    { "character": "teacher", "x": 0.85, "depth": 0.3, "pose": "stand" }
  ]
}
```

x is 0–1 across the floor, depth 0 (front) to 1 (back); the stage sorts by depth, scales by
perspective, keeps everyone inside safe bounds on phones, and spotlights the speaker.

### Performance: who is speaking

One stage director per stage, one playback clock. Mouth frames go only to the character whose
audio is audible; the others switch to listening and `lookAt` the speaker. The model's tools
stay semantic: `perform` per character, `move_to` a named spot, `set_pose`, `look_at`.
Capabilities (can sit, can fly) come from each character's plan and are sent with the tools.

Several voices: a Gemini Live session speaks with one voice. Options, cheapest first:
(a) one Live session per character, opened when that character takes the floor (handover
note like `HANDOFF`); (b) one session that voices a narrator while the others act;
(c) Gemini TTS multi-speaker for prepared scenes (tight free-tier quota).

## Build order

1. **Contracts and validation:** `look` recipe, body plans, parts, poses, `stage` panel,
   cast/props/spots; capability derivation. Room-spec tests.
2. **Humanoid plan + parts kit + stage with props**, standing and sitting, mirrored, depth
   sorted; expressions, gestures, 12-viseme mouth; deterministic rig tests; screenshots.
3. **Audio path:** port the playback clock, viseme analyzer and director against our own
   tests; drive mouths from test PCM in the browser check.
4. **Voice:** Live session per speaking character with `perform`/`look_at` tools, SILENT acks,
   interruption; first real-device acceptance.
5. **More plans:** creature, blob, tentacled, winged; then props and scenes as rooms ask.

Acceptance at every step: automated checks prove contracts and rig state, not quality.
Look at screenshots at 320/390/1280 px, then on a real phone with real speech.
