import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  agentTools,
  emptyData,
  parsePersonCall,
  runTool,
  validateRoom,
  type RoomSpec,
} from '../src/index.ts';

const goal = { type: 'text', description: 'The goal id in [brackets]' };
const services = [
  {
    source: 'lifeos.goals',
    actions: [
      {
        name: 'create_goal',
        label: 'Add a goal',
        description: 'Add a goal.',
        params: { title: { type: 'text' }, start_now: { type: 'boolean' } },
        required: ['title'],
      },
      {
        name: 'set_goal_status',
        label: 'Change a goal’s state',
        description: 'Pause, resume or archive a goal.',
        params: { goal, status: { type: 'choice', options: ['active', 'paused', 'archived'] } },
        required: ['goal', 'status'],
        confirm: true,
        characters: ['chair'],
      },
    ],
  },
];

function room(extra: object = {}) {
  return {
    schemaVersion: 1,
    id: 'board',
    title: 'Board',
    purpose: 'A test room that changes records outside itself.',
    language: 'en',
    theme: { preset: 'office', accent: '#334455' },
    characters: [
      { id: 'chair', name: 'Orion', role: 'Chair', persona: 'p', greeting: 'g', capabilities: [] },
      { id: 'clerk', name: 'Ada', role: 'Clerk', persona: 'p', greeting: 'g', capabilities: [] },
    ],
    collections: [],
    panels: [{ id: 'notes', kind: 'text', title: 'Notes', text: 'Hi' }],
    services,
    ...extra,
  };
}

function valid(input: object): RoomSpec {
  const result = validateRoom(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.spec;
}

test('service actions become tools only for the characters they name, and say they ask', () => {
  const spec = valid(room());
  const chair = agentTools(spec, spec.characters[0]);
  const clerk = agentTools(spec, spec.characters[1]).map((t) => t.name);
  assert.ok(chair.some((t) => t.name === 'set_goal_status'));
  assert.ok(!clerk.includes('set_goal_status'));
  assert.ok(clerk.includes('create_goal'));
  const status = chair.find((t) => t.name === 'set_goal_status')!;
  assert.match(status.description, /confirms it on screen/);
  assert.deepEqual(status.parameters.required, ['goal', 'status']);
});

test('a call is checked and handed to the host, never run against the room data', () => {
  const spec = valid(room());
  const chair = spec.characters[0];
  const data = emptyData(spec);
  const ok = runTool(
    spec,
    chair,
    data,
    {
      name: 'set_goal_status',
      args: { goal: 'g1', status: 'paused', extra: 'dropped' },
    },
    () => 'x',
  );
  assert.equal(ok.data, data);
  assert.deepEqual(ok.response, { pending: true });
  assert.deepEqual(ok.service, {
    source: 'lifeos.goals',
    action: 'set_goal_status',
    label: 'Change a goal’s state',
    args: { goal: 'g1', status: 'paused' },
    confirm: true,
    character: 'chair',
  });
  const bad = runTool(
    spec,
    chair,
    data,
    {
      name: 'set_goal_status',
      args: { goal: 'g1', status: 'deleted' },
    },
    () => 'x',
  );
  assert.match(String(bad.response.error), /must be one of/);
  assert.equal(bad.service, undefined);
  const clerk = runTool(
    spec,
    spec.characters[1],
    data,
    {
      name: 'set_goal_status',
      args: { goal: 'g1', status: 'paused' },
    },
    () => 'x',
  );
  assert.match(String(clerk.response.error), /not available/);
});

test('the person’s own calls from the surface pass the same params', () => {
  const spec = valid(room());
  assert.deepEqual(parsePersonCall(spec, 'create_goal', { title: 'Run', start_now: true }), {
    source: 'lifeos.goals',
    action: 'create_goal',
    args: { title: 'Run', start_now: true },
  });
  assert.ok('error' in parsePersonCall(spec, 'create_goal', {}));
  assert.ok('error' in parsePersonCall(spec, 'drop_table', {}));
});

test('services are validated: a source name, a label, no name already taken', () => {
  const broken = (s: unknown) => validateRoom(room({ services: s }));
  const errors = (s: unknown) => {
    const result = broken(s);
    return result.ok ? [] : result.errors.map((e) => e.split(':')[0]);
  };
  assert.ok(errors([{ source: 'Bad Source!', actions: services[0].actions }]).length);
  const unlabeled = [
    { ...services[0], actions: [{ ...services[0].actions[0], label: undefined }] },
  ];
  assert.ok(errors(unlabeled).some((p) => p.endsWith('label')));
  const twice = [{ ...services[0], actions: [services[0].actions[0], services[0].actions[0]] }];
  assert.ok(errors(twice).some((p) => p.endsWith('name')));
  const dataTool = [{ ...services[0], actions: [{ ...services[0].actions[0], name: 'add_goal' }] }];
  assert.ok(errors(dataTool).length);
  assert.ok(errors([]).length, 'an empty services list says nothing; leave it out');
});
