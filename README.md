# Experience the AI

Rooms with live AI characters. Each room is built for one need: who lives there (a teacher,
coach, CEO, friend, planner, news anchor, project manager), what the room remembers in its own
data, and how it looks: a dashboard, a 2.5D world that grows, and later 3D scenes.
Characters act on the room through tools derived from it.

Rooms are built by Claude Code in this repository, by talking with the person who wants the
experience: see [docs/build-a-room.md](docs/build-a-room.md). The architecture borrows the
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

| Path                  | Responsibility                                                  |
| --------------------- | --------------------------------------------------------------- |
| packages/room-spec    | Room contract, validation, data rules, derived agent tools      |
| packages/room-runtime | RoomView, built-in panels (list, stat, progress, growth, text)  |
| rooms                 | The rooms: one folder each, plus the registry                   |
| apps/platform         | The app, agent conversation and server routes (Pages Functions) |
| tools                 | Boundary/line-limit check and the local dev server              |
| tests                 | Browser flow check                                              |

## Rooms today

- كوكب العادات (kids habit planet): a child's habits grow a planet; زيزو the astronaut cheers.
- Growth Studio: quarterly goals and tasks with Maya (coach) and Otto (planner).
- أوضة المذاكرة (study room): أستاذ كريم (teacher) and سلمى (study buddy) track topics and questions.

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
Secrets: `GEMINI_API_KEY`. AI stays closed unless `OPEN_AI_PREVIEW=true` on a guarded preview.
