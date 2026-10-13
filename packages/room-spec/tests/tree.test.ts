import assert from 'node:assert/strict';
import { test } from 'node:test';
import nestedHouse from '../../../examples/nested-house/index.ts';
import {
  addRecord,
  agentTools,
  composeRoom,
  describeRooms,
  emptyData,
  innerRooms,
  pulseOf,
  runTool,
  validateRoom,
  type RoomData,
  type RoomSpec,
} from '../src/index.ts';

function house(): RoomSpec {
  const result = validateRoom(nestedHouse);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return result.spec;
}
const inner = (spec: RoomSpec, path: string) => innerRooms(spec).find((r) => r.path === path)!.spec;

/** A room with one inner room per level, `levels` deep. */
function nested(levels: number): Record<string, unknown> {
  const room = (id: string, child?: object) => ({
    id,
    title: id,
    purpose: 'p',
    characters: [{ id: 'a', name: 'A', role: 'r', persona: 'p', greeting: 'g', capabilities: [] }],
    collections: [],
    panels: child
      ? [{ id: 'in', kind: 'rooms', title: 'In' }]
      : [{ id: 't', kind: 'text', title: 'T', text: 'x' }],
    ...(child ? { rooms: [child] } : {}),
  });
  let current: object | undefined;
  for (let level = levels; level > 1; level--) current = room(`level-${level}`, current);
  const top = room('top', current);
  return { ...top, schemaVersion: 1, language: 'en', theme: { preset: 'calm', accent: '#123456' } };
}

test('composeRoom puts built rooms in place of planned stubs, keeping order', () => {
  const spec = house();
  assert.deepEqual(
    innerRooms(spec).map((r) => [r.path, Boolean(r.spec.planned)]),
    [
      ['kitchen', false],
      ['kitchen/pantry', false],
      ['garden', true],
    ],
  );
  const appended = composeRoom({ id: 'x', rooms: [{ id: 'a' }] }, [{ id: 'b' }]);
  assert.deepEqual((appended as { rooms: object[] }).rooms, [{ id: 'a' }, { id: 'b' }]);
});

test('inner rooms inherit language and theme parts they leave out', () => {
  const spec = house();
  const kitchen = inner(spec, 'kitchen');
  const pantry = inner(spec, 'kitchen/pantry');
  assert.equal(pantry.language, 'ar');
  assert.deepEqual(kitchen.theme, { preset: 'habit', accent: '#f59e0b' });
  assert.deepEqual(pantry.theme, kitchen.theme);
});

test('nesting is limited in depth, and rooms panels need rooms', () => {
  assert.equal(validateRoom(nested(4)).ok, true);
  const deep = validateRoom(nested(5));
  assert.match(!deep.ok ? deep.errors.join() : '', /nest at most 4 levels/);
  const noRooms = validateRoom({
    ...nested(1),
    panels: [{ id: 'in', kind: 'rooms', title: 'In' }],
  });
  assert.match(!noRooms.ok ? noRooms.errors.join() : '', /a rooms panel needs rooms/);
});

test('planned rooms carry only their name and purpose, and never at the top', () => {
  const source = structuredClone(nestedHouse) as any;
  source.rooms[1].characters = [];
  source.rooms[1].icon = '🌳🌳🌳🌳🌳';
  const result = validateRoom(source);
  const errors = !result.ok ? result.errors.join('\n') : '';
  assert.match(errors, /rooms\[1\]\.characters: a planned room has only id, title/);
  assert.match(errors, /rooms\[1\]\.icon: must be at most 8/);
  const top = validateRoom({ ...nested(1), planned: true });
  assert.match(!top.ok ? top.errors.join() : '', /only a room inside another can be planned/);
});

test('inner room ids, pulse fields and accents are checked like the top room', () => {
  const source = structuredClone(nestedHouse) as any;
  source.rooms[1] = { ...source.rooms[0] };
  source.rooms[0].pulse = { collection: 'tasks', field: 'task' };
  source.rooms[0].theme = { accent: 'orange' };
  const errors = (r: ReturnType<typeof validateRoom>) => (!r.ok ? r.errors.join('\n') : '');
  const result = errors(validateRoom(source));
  assert.match(result, /rooms: duplicate id kitchen/);
  assert.match(result, /rooms\[0\]\.pulse\.field: must name a boolean field/);
  assert.match(result, /rooms\[0\]\.theme\.accent/);
});

test('pulse rises from inner rooms to the top; planned rooms do not count', () => {
  const spec = house();
  const kitchen = inner(spec, 'kitchen');
  const pantry = inner(spec, 'kitchen/pantry');
  let tasks = emptyData(kitchen);
  tasks = addRecord(kitchen, tasks, 'tasks', { task: 'غسيل', done: true }, 't1');
  tasks = addRecord(kitchen, tasks, 'tasks', { task: 'طبخ' }, 't2');
  const data = new Map<string, RoomData>([['kitchen', tasks]]);
  const at = (path: string) => data.get(path);
  assert.equal(pulseOf(kitchen, at, 'kitchen'), 0.5);
  assert.equal(pulseOf(pantry, at, 'kitchen/pantry'), 0);
  assert.equal(pulseOf(spec, at), 0.5);
  const text = describeRooms(spec, at);
  assert.match(text, /- \[kitchen\] 🍳 المطبخ: .*\| الطباخ \(مسؤول المطبخ\) \| 50% alive/);
  assert.match(text, /\[t1\] \{"task":"غسيل","done":true\}/);
  assert.match(text, / {2}- \[kitchen\/pantry\] 🫙 الكرار/);
  assert.match(text, /- \[garden\] 🌳 الجنينة: .*\| planned, not built yet/);
});

test('open_room reaches built inner rooms only, and needs a note', () => {
  const spec = house();
  const [guide] = spec.characters;
  const open = agentTools(spec, guide).find((t) => t.name === 'open_room');
  const paths = (open?.parameters.properties.room as { enum: string[] }).enum;
  assert.deepEqual(paths, ['kitchen', 'kitchen/pantry']);
  const data = emptyData(spec);
  const call = (args: object) =>
    runTool(spec, guide, data, { name: 'open_room', args: { ...args } }, () => '');
  assert.deepEqual(call({ room: 'kitchen/pantry', note: 'ناقص رز' }).open, {
    path: 'kitchen/pantry',
    note: 'ناقص رز',
  });
  assert.match(String(call({ room: 'garden', note: 'x' }).response.error), /known room/);
  assert.match(String(call({ room: 'kitchen' }).response.error), /note/);
  const pantry = inner(spec, 'kitchen/pantry');
  assert.equal(
    agentTools(pantry, pantry.characters[0]).some((t) => t.name === 'open_room'),
    false,
  );
});
