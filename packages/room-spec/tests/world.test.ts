import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emptyData,
  runTool,
  validateRoom,
  worldBrief,
  agentTools,
  type RoomSpec,
} from '../src/index.ts';

/** A room that declares its own world; the engine knows nothing about what it draws. */
function room(world: unknown, extra: object = {}) {
  return {
    schemaVersion: 1,
    id: 'aquarium',
    title: 'Aquarium',
    purpose: 'A test world.',
    language: 'en',
    theme: { preset: 'calm', accent: '#3399ff' },
    characters: [
      { id: 'fish', name: 'Fin', role: 'Guide', persona: 'p', greeting: 'g', capabilities: [] },
      { id: 'crab', name: 'Claw', role: 'Helper', persona: 'p', greeting: 'g', capabilities: [] },
    ],
    collections: [],
    panels: [{ id: 'tank', kind: 'world', title: 'Tank' }],
    world,
    ...extra,
  };
}
const world = {
  surface: 'aquarium-scene',
  describe: 'A coral reef with a cave and a shipwreck.',
  actions: [
    {
      name: 'swim_to',
      description: 'Swim somewhere in the reef.',
      params: {
        place: { type: 'choice', options: ['cave', 'wreck'] },
        speed: { type: 'number', min: 0.2, max: 1 },
      },
      required: ['place'],
    },
    {
      name: 'pinch',
      description: 'Click the claws.',
      params: {},
      required: [],
      characters: ['crab'],
    },
    {
      name: 'say_hi',
      description: 'Wave to the person.',
      params: { loud: { type: 'boolean' } },
      required: [],
      silent: false,
    },
  ],
};
function valid(value: unknown): RoomSpec {
  const result = validateRoom(value);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return result.spec;
}
const errorsOf = (value: unknown) => {
  const result = validateRoom(value);
  return result.ok ? '' : result.errors.join('\n');
};

test('a room declares its world; actions default to silent', () => {
  const spec = valid(room(world));
  assert.equal(spec.world!.surface, 'aquarium-scene');
  assert.deepEqual(
    spec.world!.actions.map((a) => [a.name, a.silent]),
    [
      ['swim_to', true],
      ['pinch', true],
      ['say_hi', false],
    ],
  );
});

test('world mistakes are reported; data tool names are reserved', () => {
  const bad = structuredClone(world) as any;
  bad.actions[0].name = 'add_fish';
  bad.actions[1].characters = ['shark'];
  bad.actions[2].required = ['volume'];
  bad.actions.push({ ...bad.actions[2], name: 'say_hi', required: [] });
  bad.actions[0].params.place.options = [];
  const errors = errorsOf(room(bad));
  assert.match(errors, /actions\[0\]\.name: must be a snake_case name that is not a data tool/);
  assert.match(errors, /actions\[1\]\.characters: shark is not a character/);
  assert.match(errors, /actions\[2\]\.required: volume is not a param/);
  assert.match(errors, /duplicate action say_hi/);
  assert.match(errors, /params\.place\.options: must have 1 to 40/);
  assert.match(errorsOf(room(undefined)), /a world panel needs the room to declare a world/);
});

test('tools follow who may act; calls are checked before the surface sees them', () => {
  const spec = valid(room(world));
  const [fish, crab] = spec.characters;
  const names = (c = fish) => agentTools(spec, c).map((t) => t.name);
  assert.deepEqual(names(), ['swim_to', 'say_hi']);
  assert.deepEqual(names(crab), ['swim_to', 'pinch', 'say_hi']);
  const swim = agentTools(spec, fish)[0].parameters.properties;
  assert.deepEqual(swim.place, { type: 'string', enum: ['cave', 'wreck'], description: undefined });
  const data = emptyData(spec);
  const call = (name: string, args: object, who = fish) =>
    runTool(spec, who, data, { name, args: { ...args } }, () => '');
  assert.deepEqual(call('swim_to', { place: 'cave', speed: 9 }), {
    data,
    response: { ok: true },
    act: { character: 'fish', action: 'swim_to', args: { place: 'cave', speed: 1 } },
    silent: true,
  });
  assert.match(
    String(call('swim_to', { place: 'moon' }).response.error),
    /place must be one of cave, wreck/,
  );
  assert.match(String(call('swim_to', {}).response.error), /place is required/);
  assert.match(String(call('pinch', {}).response.error), /not available/);
  assert.equal(call('pinch', {}, crab).act?.character, 'crab');
  assert.equal(call('say_hi', { loud: true }).silent, false);
});

test('scenes give characters a play_scene tool; arrival names one of them', () => {
  const scenes = [
    { id: 'dive', description: 'The camera dives into the reef.' },
    { id: 'storm', description: 'A storm rolls over the tank.' },
  ];
  const spec = valid(room({ ...world, scenes, arrival: 'dive' }));
  assert.equal(spec.world!.arrival, 'dive');
  assert.deepEqual(valid(JSON.parse(JSON.stringify(spec))), spec, 'a checked world checks again');
  const [fish] = spec.characters;
  const tool = agentTools(spec, fish).find((t) => t.name === 'play_scene')!;
  assert.deepEqual((tool.parameters.properties.scene as { enum: string[] }).enum, [
    'dive',
    'storm',
  ]);
  assert.match(tool.description, /dive \(The camera dives into the reef\.\)/);
  const outcome = runTool(
    spec,
    fish,
    emptyData(spec),
    { name: 'play_scene', args: { scene: 'storm' } },
    () => '',
  );
  assert.deepEqual(outcome.act, {
    character: 'fish',
    action: 'play_scene',
    args: { scene: 'storm' },
  });
  assert.equal(outcome.silent, true);
  const errors = errorsOf(
    room({
      ...world,
      actions: [{ ...world.actions[0], name: 'play_scene' }],
      scenes: [scenes[0], scenes[0]],
      arrival: 'sunrise',
    }),
  );
  assert.match(errors, /actions\[0\]\.name: must be a snake_case name that is not a data tool/);
  assert.match(errors, /scenes: .*dive/);
  assert.match(errors, /arrival: must name one of the scenes/);
  assert.equal(
    agentTools(valid(room(world)), fish).some((t) => t.name === 'play_scene'),
    false,
  );
});

test('an immersive room is its world: one world panel and nothing else', () => {
  assert.equal(valid(room(world, { layout: 'immersive' })).layout, 'immersive');
  const extra = { id: 't', kind: 'text', title: 'T', text: 'x' };
  const tank = { id: 'tank', kind: 'world', title: 'Tank' };
  assert.match(
    errorsOf(room(world, { layout: 'immersive', panels: [tank, extra] })),
    /layout: an immersive room is its world: its only panel is the world/,
  );
  assert.match(
    errorsOf(room(undefined, { layout: 'immersive', panels: [extra] })),
    /layout: an immersive room is its world/,
  );
  assert.match(errorsOf(room(world, { layout: 'cinema' })), /layout: must be one of/);
});

test('the brief carries the description, the surface state and the rules', () => {
  const spec = valid(room(world));
  const brief = worldBrief(spec, spec.characters[0], 'Fin is at the cave.');
  assert.match(
    brief,
    /^A coral reef with a cave and a shipwreck\.\nNow: Fin is at the cave\.\nYou act in this world with your world tools \(swim_to, say_hi\)/,
  );
  assert.equal(
    worldBrief(
      valid(
        room(world, {
          world: undefined,
          panels: [{ id: 't', kind: 'text', title: 'T', text: 'x' }],
        }),
      ),
      spec.characters[0],
    ),
    '',
  );
});
