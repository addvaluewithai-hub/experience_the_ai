# Architecture

Experience the AI hosts rooms: themed spaces where live AI characters (teacher, CEO, friend,
planner, news anchor, project manager…) help a person, with interactive panels and the room's
own data. A room may hold rooms, which may hold rooms: a life, a house, a school are all one
room with rooms inside. The product runs rooms; it has no AI that builds them.

Two kinds of work happen in this repository:

- **Engine** (packages/, apps/, tools/): what any room can be and do. Changed by the engine
  developer, with tests and browser checks.
- **Rooms** (rooms/): built with the person who wants them, one room per session from the
  outside in, by any capable chat or model following docs/build-a-room.md and
  docs/room-spec.md. Room builders never change the engine; they file engine requests in the
  room's brief.md.

## Layers: brain, presence, surfaces

The experience is the product; how it is drawn is a choice per room.

- **Brain** (no rendering): conversations and voice, memory, room data and rules, the meaning
  of places (docs/stage.md), authored sequences and their priority, the audio clock that turns
  audible speech into mouth frames.
- **Presence** (`Presence` in packages/room-spec/src/presence.ts): the only way the brain
  touches a body: dispatch a stage command, give someone the floor, set a mode, send a mouth
  frame, read positions.
- **Surfaces**: anything that implements Presence and draws: the dashboard panels, the SVG
  stage (packages/stage-runtime, built), and next a 3D place and a Phaser 2.5D world. A room
  picks its surface; a room may ship its own.

## What came from new-learn

addvaluewithai-hub/new-learn is a reference, not a dependency. Its proven patterns, reused:

| new-learn                                              | here                                                   |
| ------------------------------------------------------ | ------------------------------------------------------ |
| LessonPackage contract + structural validation         | RoomSpec + `validateRoom` in `packages/room-spec`      |
| lesson-runtime imports only React/Remotion             | room-runtime imports only React and room-spec          |
| Curriculum renderers owned by content, allowlisted     | Room custom panels in `rooms/<id>/panels`, compiled in |
| fixtures/runtime-probe: synthetic engine content       | examples/: synthetic rooms, not product rooms          |
| Build-time content registry, no uploaded code          | `rooms/index.ts`; the app never evaluates room code    |
| Nova: server-held key, trusted context, real errors    | `/api/agent`: key in Pages secrets, rebuilt context    |
| Live `show_step` tool answered by the client           | Room tools answered by the client through room rules   |
| Same-origin mutations, bounded JSON, per-isolate guard | Same `http.ts` / `limits.ts` shape                     |
| check-boundaries + 300-line limit, CI browser checks   | Same gates, areas adapted to room folders              |
| Cloudflare Pages + Functions, Vite, npm workspaces     | Same deployment shape                                  |

Not taken: Remotion playback, curriculum import, lesson editions and the old Learn UI.

## Ownership

```
apps/platform          host: navigation, conversations, server routes, persistence adapters
packages/room-spec     contract, validation, data rules, room trees, derived tools (no deps)
packages/room-runtime  RoomView, built-in panels, themes, store interface (React only)
rooms/<id>             a real room tree: brief.md, room.json, inner rooms, custom panels
examples/<id>          synthetic rooms exercising the engine (nested-house shows a tree)
```

Platform → room-runtime → room-spec. Rooms and examples may import room-runtime and room-spec only.
The runtime never decides where data lives: the host passes a `RoomStore`.

## A room

`RoomSpec` (packages/room-spec/src/types.ts, documented in docs/room-spec.md) declares
characters, collections, panels, theme, language, and optionally an icon, a pulse and inner
rooms. It is data, never code. Validation walks the whole tree (4 levels, 40 rooms), fills in
what inner rooms inherit, checks every reference and returns a copy with only known keys.
Structural validity means "the runtime can render it", not that the room was reviewed.

- **Planned rooms** are inner rooms agreed but not built (id, title, purpose, icon). They show
  as closed doors, so a world is built from the outside in. `composeRoom` swaps a stub for the
  built room when its folder exists.
- **Pulse**: a room is as alive as the share of one boolean field that is true; a room without
  one averages its inner rooms. The `rooms` panel (doors or a 2.5D world) lights each door by it.
- Each room in a tree has its own store and its own page at its path (`#/room/life/health`).

## Data: each room has its own database shape

A room's collections are its schema. `data.ts` holds the only rules for records: declared
fields only, typed values, required fields, size caps. A person's edit, an agent's tool call and
a snapshot arriving at the server all pass through them.

Today the store is in memory (one tab). Persistence plan, in order:

1. Accounts (Neon Auth, as in new-learn) and a `room_app` schema: `room_editions` (immutable
   spec + hash), `room_instances` (a person's room pinned to an edition) and `room_records`
   (instance, collection, record id, `values jsonb`, revision). Writes validate with room-spec
   and use expected-revision updates, like new-learn's progress API.
2. The schema lives in the spec, so a new room needs no migration and no generated SQL.
3. A room that truly needs relational queries can later get a dedicated Postgres schema,
   generated from its spec at publish time and reviewed like any migration.
4. A new spec edition never rewrites existing records; moving an instance forward is explicit.

Test DB changes on a separate Neon branch before connecting production.

## Characters and tools

`agentTools(spec, character)` derives typed tools from the collections and the character's
capabilities. `/api/agent` rebuilds the room and data from the request, puts the data in the
system instruction as content (not instructions), and returns the model's parts. The client
runs each call with `runTool`, applies the result to its store, and sends the results back
until the character answers in words (at most six steps). A failed exchange is not kept as
history. Several characters each keep their own conversation; each speaks only as itself.

A character reads its own room's data and a summary of every room inside it (sent as `below`,
rebuilt per room on the server), but writes only its own. `open_room` takes the person into a
built inner room: the client navigates there and that room's first character receives a
`HANDOFF` note and continues. Conversations live outside pages (features/room/conversation.ts),
so they survive moving between rooms and a reply in flight still lands.

## Security now

AI routes are closed unless the `OPEN_AI_PREVIEW=true` secret is set (docs/deploy.md);
there are no accounts to bill or limit yet. The guard is per isolate, not a distributed quota. The preview spec and data come from
the browser and only affect that person's session; with persistence the server will load the
spec by edition and the data from the database instead of trusting the request.

## Next

1. Accounts + persisted rooms (above).
2. Voice: port new-learn's Nova Live. Server mints a single-use token with the character's
   persona and voice locked; Live function calls are answered by the same `runTool`.
   Several live characters: one session per active speaker, with a context note on handover.
3. MCP and outside services: platform-registered MCP servers (never URLs inside a spec), a
   room lists which it uses, tools run on the server with the person's own authorization, and
   anything that changes the outside world asks the person first.
4. 3D/2.5D scenes as custom panels first (e.g. react-three-fiber inside a room folder); promote
   to a built-in once a second room needs it.
5. Room catalogue, sharing, schools with rooms and curricula as collections of rooms.

## Gates

At most 300 lines per authored file. `npm run check` enforces it and the import boundaries.
Unit tests cover contract, data rules, tools, rendering and server routes with the provider
mocked; `npm run test:browser` covers rooms, nested rooms, planned doors, handoff and the agent
tool loop in Chromium with the API mocked. Neither proves a real model's behaviour: check a real conversation on a preview.
