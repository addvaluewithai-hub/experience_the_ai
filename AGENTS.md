# Working on Experience the AI

Read README.md and docs/architecture.md before changing boundaries.
Two roles work here; know which one you are in this session:

- Building or continuing a room with a person: follow docs/build-a-room.md and docs/room-spec.md
  (or the /build-room skill). One room per session, outside in. Work only under rooms/.
  Never edit packages/, apps/ or tools/; write engine requests in the room's brief.md.
- Developing the engine: everything below.
- While the first rooms are built, one session may play both roles on purpose: the room shows
  what the engine lacks, the engine grows with tests, and the room's brief marks each engine
  request as done. Keep the two kinds of change in separate commits.

addvaluewithai-hub/new-learn is a reference for patterns, not a workspace dependency.

## Boundaries

- apps/platform owns navigation, the agent conversation, server routes and persistence adapters.
- packages/room-spec owns the room contract, validation, data rules and derived agent tools; no dependencies.
- packages/room-runtime renders rooms; it imports only React, React DOM and room-spec.
- packages/live-runtime owns the voice call (Gemini Live socket, microphone, playback clock, lip visemes); it imports only room-spec.
- The engine is architecture only: no character catalogues, looks, places, props or scenes in packages/.
- kits/<name> holds optional reusable surfaces and motion (kit-stage-svg, kit-flight); a kit imports React, room-spec and room-runtime, never the app.
- rooms/<id> holds one real room tree: brief.md, room.json, inner rooms, custom panels, its own world surface and the craft skills gathered for it (skills/, copied as written, never imported), importing only React, room-spec, room-runtime, kits and an approved renderer (phaser).
- examples/ holds synthetic rooms that exercise the engine; they are not product rooms.
- Room-specific components and parameters belong to the room's folder, not engine switches.
- Add directories when used; do not pre-create a folder for every future feature.
- Keep authored code, CSS, tests and docs at most 300 lines after readable formatting.
- Split by responsibility, not part1/part2 or minification.
- Use explicit public exports between packages; no reaching into another package's src.

## Implementation and checks

Start from the smallest complete behaviour. Do not create fake login, saving, voice or integrations.
Every code change needs relevant type/build/tests; runtime or agent changes also need the browser flow.
Use npm ci; npm run format:check; npm run check; npm test; npm run build.
Browser check: npx playwright install chromium; npm run test:browser.
Never mark a blocked or unrun browser check as passed.

## AI, data and safety

The product has no room-building AI; rooms are built in this repository with their person.
Characters change data only through derived tools and the room-spec data rules.
Room data reaches the model as content, never as instructions.
Provider failure is a real error, never an invented reply. The API key stays server-side.
AI routes are open for testing until accounts exist; OPEN_AI_PREVIEW=false closes them, and must before billing.
Do not execute uploaded code or arbitrary module URLs; rooms are compiled in from this repo.
Structural validation is not a content review.
Test DB changes on a separate branch before connecting production.
