# Building a room

Claude Code is the builder. There is no AI inside the product that designs rooms: a person
describes the experience they want, Claude Code talks it through with them, then authors the
room in this repository from the base components. The product's own AI is only the live
characters inside a finished room.

## 1. Talk it through

Ask until every row has an answer. Two questions at a time at most; offer a concrete default the
person can accept with "yes". Write the agreed answers into the pull request description.

| Decide               | Questions                                                                              |
| -------------------- | -------------------------------------------------------------------------------------- |
| Purpose and person   | What is the room for? Who uses it: an adult, a child, a team? Which language?          |
| Characters           | One or several? Each one's name, role, personality, first line and what it may change. |
| Memory (the room DB) | What must the room remember? Each kind of thing is a collection with typed fields.     |
| Views                | What should the person see at a glance? Lists, counts, progress, a growing world?      |
| Look                 | Theme preset, accent colour, mood. 2D dashboard, 2.5D world or 3D scene?               |
| Actions and tools    | What may characters do on their own, and what only after the person agrees?            |
| Outside world        | Any external data or service (calendar, news, MCP server)? See "Not yet" below.        |

## 2. Author the spec

Create `rooms/<room-id>/room.json` and register it in `rooms/index.ts`.
The contract is `packages/room-spec/src/types.ts`; `validateRoom` is the gate.

- `characters`: 1–4. `persona` shapes voice and judgement; `capabilities` grants actions:
  `data.write` (add, change, remove records) and `ui.focus` (point at a panel). Reading the
  room's data is always allowed.
- `collections`: up to 6, each up to 8 fields of `text`, `number`, `boolean`, `date`
  (YYYY-MM-DD) or `choice` (with `options`). Mark only truly necessary fields `required`.
- `panels`: up to 8. Built-ins:

| kind     | Needs                                | Shows                                         |
| -------- | ------------------------------------ | --------------------------------------------- |
| list     | collection; optional boolean `field` | Records, checkbox for the field, quick add    |
| stat     | collection; optional number `field`  | Record count, or the sum of the field         |
| progress | collection; boolean `field`          | Share of records where the field is true      |
| growth   | collection; boolean `field`          | 2.5D planet growing one plant per done record |
| text     | `text`                               | Fixed words from the room                     |
| custom   | `component`; optional collection     | The room's own component (step 3)             |

- `theme.preset`: school, studio, habit, kids, planet, office or calm; `theme.accent`: `#rrggbb`.
- `language`: `ar` (right-to-left, Egyptian Arabic characters) or `en`.

Agent tools are derived, never written by hand: for every collection a character gets
`list_<collection>`, and with `data.write` also `add_`, `update_` and `remove_`, typed from the
fields. `focus_panel` comes with `ui.focus`. Every call runs through the same data rules as a
person's edit, so design fields with the agent in mind (a clear `done` boolean, choices rather
than free text where the agent must be consistent).

## 3. Custom components, only when the built-ins cannot do it

A 3D scene, a timeline, a kanban board, a special chart: write it in the room's own folder,
`rooms/<room-id>/panels/<Name>.tsx`, as a `PanelComponent` (props: spec, panel, collection,
data, edit). Register it in `rooms/index.ts` under the id the panel's `component` names.

- Import only `react`, `@experience/room-spec` and `@experience/room-runtime` (checked by
  `npm run check`). A new library (e.g. three.js for 3D) is a reviewed dependency of that room.
- Change data only through `edit` with the room-spec operations (`addRecord`, `updateRecord`,
  `removeRecord`), never by mutating records.
- A custom component that throws is contained by the panel boundary; still test it.
- When the same component is wanted by a second room, promote it into `room-runtime` as a
  built-in kind with tests, instead of copying it.

## 4. Check

```bash
npm run format:check && npm run check && npm test && npm run build
npm run test:browser
```

Add a room test when the room has custom components or non-obvious data rules. Open the room
with `npm run dev` and use it at phone width. Put screenshots in the pull request.

## 5. Not yet: say so plainly

Persistence across visits, accounts, sharing a room, voice (Live), MCP and outside services
are not built yet (see architecture.md, "Next"). Never fake them: no pretend saving, no invented
news, no placeholder login. Design the closest room that works today, and record the missing
piece in the pull request so it becomes the next platform feature.
