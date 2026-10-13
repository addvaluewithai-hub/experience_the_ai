import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { examples as rooms } from '../../../examples/index.ts';
const byId = (id: string) => rooms.find((r) => (r.spec as { id: string }).id === id)!.spec;
const exampleRooms = ['kids-habit-planet', 'self-growth-studio', 'study-room'].map(
  (id) => rooms.find((r) => (r.spec as { id: string }).id === id)!.spec,
);
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

test('AI routes close with OPEN_AI_PREVIEW=false, and reject other origins', async () => {
  const closed = await handleRequest(
    new Request('http://app.test/api/agent', {
      method: 'POST',
      headers: { origin: 'http://app.test' },
    }),
    { GEMINI_API_KEY: 'k', OPEN_AI_PREVIEW: 'false' },
  );
  assert.equal(closed.status, 503);
  const status = (env: object) =>
    handleRequest(new Request('http://app.test/api/status'), env).then((r) => r.json());
  assert.deepEqual(await status({ GEMINI_API_KEY: 'k' }), { ai: true });
  assert.deepEqual(await status({}), { ai: false });
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

test('a character reads the rooms inside its own and can send the person there', async () => {
  const seen = provider([{ text: 'تمام' }]);
  const below = { kitchen: { tasks: [{ id: 't1', values: { task: 'غسيل', done: true } }] } };
  const base = {
    room: byId('nested-house'),
    characterId: 'guide',
    data: {},
    turns: say('عايز أطبخ'),
  };
  assert.equal((await post('/api/agent', { ...base, below })).status, 200);
  const instruction = seen[0].systemInstruction.parts[0].text;
  assert.match(instruction, /<inner_rooms>/);
  assert.match(instruction, /- \[kitchen\] 🍳 المطبخ: .*100% alive/);
  assert.match(instruction, /\[t1\] \{"task":"غسيل","done":true\}/);
  assert.match(instruction, /- \[garden\] 🌳 الجنينة: .*planned, not built yet/);
  assert.match(instruction, /HANDOFF/);
  const names = seen[0].tools[0].functionDeclarations.map((t: { name: string }) => t.name);
  assert.ok(names.includes('open_room') && !names.includes('add_tasks'));
  const bad = { kitchen: { tasks: [{ id: 't1', values: { task: 3 } }] } };
  assert.equal((await post('/api/agent', { ...base, below: bad })).status, 400);
});

test('a character in a world gets its description, the surface state and world tools', async () => {
  const seen = provider([{ text: 'يلا' }]);
  const response = await post('/api/agent', {
    room: byId('classroom-stage'),
    characterId: 'ms-nour',
    data: {},
    world: `omar (عمر) standing at قدام السبورة. ${'x'.repeat(3000)}`,
    turns: say('اشرحي لنا'),
  });
  assert.equal(response.status, 200);
  const instruction = seen[0].systemInstruction.parts[0].text;
  assert.match(instruction, /<world>\nA classroom stage\.\nPlaces: board "السبورة"/);
  assert.match(instruction, /\nNow: omar \(عمر\) standing at قدام السبورة\. x+\n/);
  assert.ok(!instruction.includes('x'.repeat(2001)), 'the surface state is bounded');
  const names = seen[0].tools[0].functionDeclarations.map((t: { name: string }) => t.name);
  for (const name of ['go_to', 'play_routine', 'look_at', 'set_pose', 'perform'])
    assert.ok(names.includes(name));
});

test('a voice ticket locks the character, its voice, instruction and silent world tools', async () => {
  const seen: { url: string; body: any }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen.push({ url, body: JSON.parse(String(init.body)) });
    return Response.json({ name: 'auth_tokens/abc' });
  }) as typeof fetch;
  const spec = structuredClone(byId('classroom-stage')) as any;
  spec.characters[0].voice = 'Puck';
  const response = await post('/api/live', { room: spec, characterId: 'ms-nour', data: {} });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual([result.token, result.model], ['auth_tokens/abc', 'gemini-3.8-live']);
  assert.match(seen[0].url, /\/v1beta\/auth_tokens$/);
  assert.equal(seen[0].body.uses, 1);
  const { model, ...setup } = seen[0].body.bidiGenerateContentSetup;
  assert.equal(model, 'models/gemini-3.8-live');
  assert.deepEqual(result.config, setup, 'the browser gets exactly the locked setup');
  assert.equal(
    setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
    'Puck',
  );
  assert.match(setup.systemInstruction.parts[0].text, /<world>[\s\S]*live voice call/);
  const tools = setup.tools[0].functionDeclarations;
  const go = tools.find((t: { name: string }) => t.name === 'go_to');
  assert.equal(go.behavior, 'NON_BLOCKING');
  assert.equal(go.parameters.type, 'OBJECT');
  assert.equal(go.parameters.properties.place.type, 'STRING');
  assert.equal(tools.find((t: { name: string }) => t.name === 'add_ideas').behavior, undefined);

  spec.characters[0].voice = 'Robot';
  assert.equal(
    (await post('/api/live', { room: spec, characterId: 'ms-nour', data: {} })).status,
    400,
  );
});
