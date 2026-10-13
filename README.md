# Experience the AI

Rooms with live AI characters. Each room is built for one need: who lives there (a teacher,
coach, CEO, friend, planner, news anchor, project manager), what the room remembers in its own
data, and how it looks: a dashboard, a stage, a game or a cinematic world drawn by the room's
own surface.
Characters act on the room through tools derived from it.

A room can hold rooms, which can hold rooms: a whole life, a house, a school. Rooms are built
in this repository with the person who wants them, one room at a time from the outside in,
by any capable chat or model: [docs/build-a-room.md](docs/build-a-room.md) (the way of
working) and [docs/room-spec.md](docs/room-spec.md) (what a room can contain). In Claude Code,
`/build-room` starts it. The architecture borrows the
proven foundation of addvaluewithai-hub/new-learn: [docs/architecture.md](docs/architecture.md).

## Run

Node.js 22.12+ and npm.

```bash
npm ci
npm run dev        # http://localhost:5173, API on :8787
```

Rooms and panels work without any key. To talk to characters locally, create an untracked
`.dev.vars`:

```
GEMINI_API_KEY=...
OPEN_AI_PREVIEW=true
```

## Where things are

| Path                  | Responsibility                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------- |
| packages/room-spec    | Room contract, validation, data rules, room trees, agent tools                               |
| packages/room-runtime | RoomView, panels (list, stat, progress, growth, text, rooms, world) and the surface contract |
| packages/live-runtime | Voice calls: Gemini Live, microphone, playback clock, lip visemes                            |
| kits                  | Optional reusable surfaces and motion (the SVG stage)                                        |
| rooms                 | Real rooms, one folder per top room                                                          |
| examples              | Synthetic engine examples, including a nested room tree                                      |
| apps/platform         | The app, agent conversation and server routes (Pages Functions)                              |
| tools                 | Boundary/line-limit check and the local dev server                                           |
| tests                 | Browser flow check                                                                           |

## Rooms

`npm run rooms` prints every room tree: ✓ built, ○ planned. `-- --examples` adds the
engine examples (a nested house with a planned garden, a kids habit planet, a growth studio,
a study room).

## Check

```bash
npm run format:check
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

## Deploy (Cloudflare Pages)

Build command `npm run build`, output `dist`, Functions from `functions/`.
Secrets `GEMINI_API_KEY` and `OPEN_AI_PREVIEW=true` open the characters. Steps: [docs/deploy.md](docs/deploy.md).
