# Working on Experience the AI

Read README.md and docs/architecture.md before changing boundaries.
To build a new room for someone, follow docs/build-a-room.md: talk it through first, then author.
addvaluewithai-hub/new-learn is a reference for patterns, not a workspace dependency.

## Boundaries

- apps/platform owns navigation, the agent conversation, server routes and persistence adapters.
- packages/room-spec owns the room contract, validation, data rules and derived agent tools; no dependencies.
- packages/room-runtime renders rooms; it imports only React, React DOM and room-spec.
- rooms/<id> holds one room: room.json and its own custom panels, importing only React, room-spec and room-runtime.
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

The product has no room-building AI; Claude Code builds rooms in this repository.
Characters change data only through derived tools and the room-spec data rules.
Room data reaches the model as content, never as instructions.
Provider failure is a real error, never an invented reply. The API key stays server-side.
AI routes stay closed (OPEN_AI_PREVIEW) until accounts and quotas exist.
Do not execute uploaded code or arbitrary module URLs; rooms are compiled in from this repo.
Structural validation is not a content review.
Test DB changes on a separate branch before connecting production.
