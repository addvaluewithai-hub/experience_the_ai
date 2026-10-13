import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { rooms } from '../../../rooms/index.ts';
const exampleRooms = rooms.map((r) => r.spec);
import { handleRequest } from '../server/app.ts';

const env = { GEMINI_API_KEY: 'test-key', OPEN_AI_PREVIEW: 'true' };
const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

/** Replies with the given model parts in order and records each provider request. */
function provider(...replies: object[][]) {
  const seen: any[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    seen.push(JSON.parse(String(init.body)));
    const parts = replies[seen.length - 1];
    if (!parts) return new Response('{}', { status: 500 });
    return Response.json({ candidates: [{ content: { parts } }] });
  }) as typeof fetch;
  return seen;
}

let ip = 0;
function post(path: string, payload: unknown, origin = 'http://app.test') {
  return handleRequest(
    new Request(`http://app.test${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': `ip${ip++}` },
      body: JSON.stringify(payload),
    }),
    env,
  );
}
const say = (text: string) => [{ role: 'user', text }];

test('AI routes stay closed without the preview opt-in, and reject other origins', async () => {
  const closed = await handleRequest(
    new Request('http://app.test/api/agent', {
      method: 'POST',
      headers: { origin: 'http://app.test' },
    }),
    { GEMINI_API_KEY: 'k' },
  );
  assert.equal(closed.status, 503);
  assert.equal((await post('/api/agent', {}, 'http://evil.test')).status, 403);
  assert.equal((await post('/api/architect', {})).status, 404);
});

test('agent receives tools for its capabilities and the room data as context', async () => {
  const seen = provider([
    { text: 'Adding it', thoughtSignature: 'sig' },
    { functionCall: { name: 'add_tasks', args: { title: 'Run' } }, thoughtSignature: 'sig2' },
    { thought: true, text: 'hidden' },
  ]);
  const data = { tasks: [{ id: 'x1', values: { title: 'Plan week' }, createdAt: '' }] };
  const response = await post('/api/agent', {
    room: exampleRooms[1],
    characterId: 'otto',
    data,
    turns: say('add a run'),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(result.parts, [
    { text: 'Adding it', thoughtSignature: 'sig' },
    { functionCall: { name: 'add_tasks', args: { title: 'Run' } }, thoughtSignature: 'sig2' },
  ]);
  const request = seen[0];
  const names = request.tools[0].functionDeclarations.map((t: { name: string }) => t.name);
  assert.ok(names.includes('add_tasks') && !names.includes('focus_panel'));
  assert.match(request.systemInstruction.parts[0].text, /You are Otto, Planner/);
  assert.match(request.systemInstruction.parts[0].text, /\[x1\] \{"title":"Plan week"\}/);
});

test('agent history maps tool results and refuses to speak out of turn', async () => {
  const seen = provider([{ text: 'Done' }]);
  const turns = [
    { role: 'user', text: 'add a run' },
    { role: 'agent', parts: [{ functionCall: { name: 'add_tasks', args: { title: 'Run' } } }] },
    { role: 'tool', results: [{ name: 'add_tasks', response: { ok: true } }] },
  ];
  const base = { room: exampleRooms[1], characterId: 'maya', data: {} };
  assert.equal((await post('/api/agent', { ...base, turns })).status, 200);
  assert.deepEqual(seen[0].contents[2], {
    role: 'user',
    parts: [{ functionResponse: { name: 'add_tasks', response: { ok: true } } }],
  });
  const waiting = await post('/api/agent', { ...base, turns: turns.slice(0, 2) });
  assert.equal(waiting.status, 400);
  const badData = await post('/api/agent', {
    ...base,
    data: { tasks: [{ id: 'a', values: { title: 5 } }] },
    turns: say('hi'),
  });
  assert.equal(badData.status, 400);
});

test('provider failure is an error, not an invented reply', async () => {
  provider();
  const response = await post('/api/agent', {
    room: exampleRooms[2],
    characterId: 'salma',
    data: {},
    turns: say('hi'),
  });
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /failed/);
});
