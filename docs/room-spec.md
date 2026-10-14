# Room spec reference

Everything a room can say. The source of truth is `packages/room-spec/src/types.ts`;
`validateRoom` enforces it. A room is data only: no code, no URLs, no HTML.

## Folder layout

```
rooms/<room-id>/
  brief.md            what was agreed with the person, decisions, open questions
  room.json           this room (inner rooms listed as planned stubs until built)
  index.ts            composes this room with its built inner rooms
  panels/*.tsx        custom components, only if the built-ins cannot do it
  world/              its own surface, when it draws its world itself
  skills/             the best craft skills for how it is drawn, with README.md (sources)
  rooms/<inner-id>/   an inner room, the same shape again (up to 4 levels in all)
```

`index.ts` of a room with inner rooms:

```ts
import { composeRoom } from '@experience/room-spec';
import kitchen from './rooms/kitchen'; // a built inner room (its own index.ts or room.json)
import room from './room.json';

export default composeRoom(room, [kitchen]);
```

`composeRoom` swaps each planned stub in `room.json` for the built room with the same id and
keeps the order. A room without inner rooms needs no `index.ts`. Register each **top** room
once in `rooms/index.ts`: `{ spec: <its default export>, panels: { ... } }`.
`examples/nested-house` is a complete working example of this layout.

## The room

| Key             | Required               | Meaning                                                                                 |
| --------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `schemaVersion` | top room only          | `1`                                                                                     |
| `id`            | yes                    | kebab-case, unique among its siblings; part of the room's path                          |
| `title`         | yes                    | ≤ 60 characters                                                                         |
| `purpose`       | yes                    | ≤ 600; what the room is for and who it serves (characters read it)                      |
| `language`      | top room; inherited    | `ar` (right to left, Egyptian Arabic characters) or `en`                                |
| `theme`         | top room; inherited    | `{ preset, accent }`; an inner room may set either or both                              |
| `icon`          | no                     | an emoji ≤ 8 characters; how the room looks as a door in its parent                     |
| `characters`    | yes, 1–4               | who lives here                                                                          |
| `collections`   | yes, 0–6 (may be `[]`) | what the room remembers: its own database                                               |
| `panels`        | yes, 1–8               | what the person sees                                                                    |
| `layout`        | no                     | `panels` (default, a page) or `immersive` (the room is its world; see Immersive rooms)  |
| `presence`      | immersive rooms only   | `overlay` (default, captions over the world) or `dock` (characters beside a working UI) |
| `pulse`         | no                     | `{ collection, field }`: a boolean field whose share of true is how alive the room is   |
| `world`         | no                     | a place its characters act in, drawn by the room's own surface (see World and surface)  |
| `rooms`         | no, 0–8                | inner rooms (built or planned)                                                          |
| `planned`       | inner rooms only       | `true`: agreed but not built; only `id`, `title`, `purpose`, `icon`                     |

Theme presets: `school`, `studio`, `habit`, `kids`, `planet` (dark, space), `office`, `calm`.
Accent: `#rrggbb`. Limits for a whole tree: 4 levels, 40 rooms.

## Characters

```json
{
  "id": "coach",
  "name": "حسام",
  "role": "مدرب صحة",
  "persona": "How it thinks and talks, what it cares about, what it refuses, when it sends the person to an inner room.",
  "greeting": "The first line the person sees.",
  "capabilities": ["data.write", "ui.focus"],
  "voice": "Leda"
}
```

- `voice` (optional) is the character's spoken voice in a voice call, one of the names in
  `VOICES` from `@experience/room-spec`; without it a default voice speaks.
- `name`, `role` ≤ 60; `persona`, `greeting` ≤ 600. In Arabic, write greetings that do not
  assume the person's gender.
- Every character can read its room's data and the data of all rooms inside it, and knows the
  person's local date, weekday and time (for habits that belong to the person's day).
- `data.write` lets it add, change and delete records of **its own room only**.
- `ui.focus` lets it point at a panel while talking.
- A character in a room with built inner rooms can take the person into one (`open_room`); the
  first character of that room continues from its note. Order characters so the one who
  should receive people comes first.

## Collections (the room's database)

```json
{
  "id": "tasks",
  "label": "المهام",
  "fields": [
    { "id": "task", "label": "المهمة", "type": "text", "required": true },
    { "id": "due", "label": "آخر ميعاد", "type": "date" },
    {
      "id": "priority",
      "label": "الأولوية",
      "type": "choice",
      "options": ["عاجل", "مهم", "بعدين"]
    },
    { "id": "minutes", "label": "دقايق", "type": "number" },
    { "id": "done", "label": "خلصت", "type": "boolean" }
  ]
}
```

- Field types: `text` (≤ 600), `number`, `boolean`, `date` (`YYYY-MM-DD`), `choice` (1–12
  `options`). Up to 8 fields. At most 200 records per collection.
- A list panel offers quick add only when the first text field is the only required field.
- Characters get typed tools per collection: `list_<id>`, and with `data.write` also
  `add_<id>`, `update_<id>`, `remove_<id>` (dashes become underscores). Prefer a clear boolean
  (done, reached, rested) and choices over free text where a character must be consistent.

## Panels

| `kind`     | Keys                                   | Shows                                                             |
| ---------- | -------------------------------------- | ----------------------------------------------------------------- |
| `list`     | `collection`; optional boolean `field` | records, a checkbox for the field, remove, quick add              |
| `stat`     | `collection`; optional number `field`  | the record count, or the sum of the field                         |
| `progress` | `collection`; boolean `field`          | share of records where the field is true                          |
| `growth`   | `collection`; boolean `field`          | a 2.5D planet growing one plant per true record                   |
| `text`     | `text` (≤ 600)                         | fixed words                                                       |
| `rooms`    | `view`: `doors` (default) or `world`   | the inner rooms, lit by their pulse; planned ones as closed doors |
| `world`    | none                                   | the room's world, drawn by its surface                            |
| `custom`   | `component` id; optional `collection`  | a component from the room's `panels/` folder                      |

Every panel has `id`, `kind`, `title` (≤ 60) and optional `wide: true` (full row).
A `rooms` panel needs at least one inner room. A `world` panel needs the room to declare a
`world`, and a room shows its world at most once.

## World and surface

A room that is a place (a game, a 3D scene, a stage, a showroom, a sky to fly in) declares
its `world`: which surface draws it, how it looks in words, and what its characters may do
there. The engine knows no places, bodies or props; it turns the declared actions into checked
tools and hands each accepted call to the room's surface.

```json
"world": {
  "surface": "valley-phaser",
  "describe": "A rainbow valley: a crystal river, a meadow, clouds above.",
  "actions": [
    {
      "name": "fly_to",
      "description": "Fly to a place in the valley while you keep talking.",
      "params": {
        "place": { "type": "choice", "options": ["river", "meadow", "clouds"] },
        "speed": { "type": "number", "min": 0.2, "max": 1 }
      },
      "required": ["place"],
      "characters": ["unicorn"]
    }
  ]
}
```

- Action and param names are lowercase words joined by `_` (like `fly_to`), never a data tool
  name (`list_…`, `add_…`, `update_…`, `remove_…`, `open_room`). Up to 16 actions, 8 params
  each; `describe` ≤ 1500.
- Param types: `text` (≤ 300), `number` (`min`/`max`, values outside are clamped), `boolean`,
  `choice` (1–40 `options`). The model names things by option, never by coordinates.
- `characters` limits an action to some characters; all may use it when absent.
- `silent` (default `true`): presentation only, answered without interrupting speech. Set
  `false` when the character needs the result to continue.
- `scenes` (optional, 1–12): directed moments the surface plays (camera shots, staging,
  effects), each `{ "id": "valley-tour", "description": "…" }`. Characters get one
  `play_scene` tool to play them when it fits; the name is reserved for it.
- `arrival` (optional): the id of the scene the surface plays when a person arrives, before
  anyone speaks. In an immersive room the way to begin appears when it ends; the surface may
  vary it (long the first time, short after) from the room's own data.
- A scene named `to-<inner room id>` (e.g. `to-kitchen`) stages the way into that inner room:
  when a character takes the person there with `open_room`, it plays first.

The surface lives in the room's folder (or comes from a kit), may draw with `phaser` (import it
lazily inside the view so only this room loads it; `@experience/kit-phaser` gives the frame,
the director, pinned interface and who holds the floor, and `kit-phaser/game` the sharp,
resizing game for the lazy scene module), and implements `RoomSurface` from
`@experience/room-runtime`: `View` (what the `world` panel shows), `act(character, action,
args)`, `speak(character | null)`, `setMode(character, mode)`, `mouth(character, frame)` (lip
shapes during voice), `state()` (the world now, in words, read before each turn) and, with
scenes, `play(scene)` (the director: resolves when the scene is over). Register
the room with it: `{ spec, surface: (spec, store, path) => new MySurface(spec, store) }`.

The view receives `frame`: `panel` inside a page (choose your own shape, e.g. 16:9) or
`screen` in an immersive room (fill the parent: it is the whole screen, any shape from a tall
phone to a wide desktop).

A kit can build both halves. The SVG stage kit: `stageRoom(room, stageConfig)` from
`@experience/kit-stage-svg` returns the entry with its world declared (see
`examples/classroom-stage` and `kits/stage-svg/docs`).

## Immersive rooms

`"layout": "immersive"` makes the room its world: the surface fills the screen, with no
title, panels or forms. The person meets the characters by voice: one tap ("يلا نبدأ ✨")
starts a call and the character speaks first; what is said floats as captions over the
world; a small keyboard stands in when voice cannot be used; with several characters, small
name buttons choose who to talk to. Characters change everything through their tools (data,
world actions, `open_room`), so the world must show what changed (a river that sparkles, a
colour that returns). When a character takes the person into an immersive inner room during a
call, the call carries on: after that room's arrival scene its first character speaks first,
from the note. Rules: the room needs a `world`, and its only panel is the `world`
panel. A room meant for forms, lists and dashboards (a parents' corner) stays `panels`.

With `"presence": "dock"` the world is a working interface in the room's own style (a day
planner, a tracker) rather than a place to live in: the person taps it as well as talking,
and the characters sit beside it (a side column on wide screens, a sheet that opens at the
bottom of a phone) with their conversation, typing and a voice call always at hand. On
arrival the first character speaks first in words, once per visit, from its persona and the
data. Choose it for adults who need someone to manage, plan and follow up.

## Pulse

A room with `pulse` is as alive as the share of its records where the field is true (no records
yet is 0, a dim door). A room without `pulse` takes the average of its built inner rooms. The
parent's `rooms` panel lights each door by it, so the top room shows at a glance which parts
are alive. Choose the field that means "this part of life is being looked after".

## Custom panels

`rooms/<top-room>/panels/<Name>.tsx` exporting a React component that receives
`{ spec, panel, collection, data, edit, world }`. Change data only through `edit` with
`addRecord`, `updateRecord`, `removeRecord` from `@experience/room-spec`. Import only `react`, the kits,
`@experience/room-spec` and `@experience/room-runtime`. Register it in `rooms/index.ts` under
the id that the panel's `component` names; one map serves the whole tree. A failing
component is contained by the panel boundary. A component two rooms need belongs in the engine:
ask for it instead of copying it.

## Planned stub

```json
{
  "id": "garden",
  "title": "الجنينة",
  "icon": "🌳",
  "purpose": "What it will be for.",
  "planned": true
}
```

## Checks

```bash
npm run rooms          # the tree: ✓ built, ○ planned, ✗ errors
npm run format:check && npm run check && npm test && npm run build
npm run test:browser
```
