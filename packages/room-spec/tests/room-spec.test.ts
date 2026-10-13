import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examples as rooms } from '../../../examples/index.ts';
const exampleRooms = ['kids-habit-planet', 'self-growth-studio', 'study-room'].map(
  (id) => rooms.find((r) => (r.spec as { id: string }).id === id)!.spec,
);
import {
  addRecord,
  agentTools,
  DataError,
  emptyData,
  parseData,
  runTool,
  updateRecord,
  validateRoom,
  type RoomSpec,
} from '../src/index.ts';

function room(index = 0): RoomSpec {
  const result = validateRoom(exampleRooms[index]);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return result.spec;
}

test('every shipped room is structurally valid', () => {
  for (const room of rooms) assert.equal(validateRoom(room.spec).ok, true);
});

test('validation strips unknown keys and normalises the accent', () => {
  const source = structuredClone(exampleRooms[0]) as Record<string, any>;
  source.script = '<script>alert(1)</script>';
  source.theme.accent = '#FF8A3D';
  const result = validateRoom(source);
  assert.ok(result.ok);
  assert.equal('script' in result.spec, false);
  assert.equal(result.spec.theme.accent, '#ff8a3d');
});

test('broken references and wrong field kinds are reported', () => {
  const source = structuredClone(exampleRooms[1]) as Record<string, any>;
  source.panels[1].collection = 'missing';
  source.panels[3].field = 'title';
  source.panels[4].field = 'done';
  source.characters.push({ ...source.characters[0] });
  const result = validateRoom(source);
  assert.equal(result.ok, false);
  const errors = !result.ok ? result.errors.join('\n') : '';
  assert.match(errors, /panels\[1\]\.collection/);
  assert.match(errors, /panels\[3\]\.field: must name a boolean/);
  assert.match(errors, /panels\[4\]\.field: must name a number/);
  assert.match(errors, /duplicate id maya/);
});

test('root fields are checked too', () => {
  const source = { ...(exampleRooms[0] as object), id: 'Not An Id', language: 'fr' };
  const result = validateRoom(source);
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.errors.join() : '', /id: must be a kebab-case id/);
});

test('records follow the collection schema', () => {
  const spec = room(1);
  let data = emptyData(spec);
  data = addRecord(spec, data, 'tasks', { title: 'Run', minutes: 30, due: '2026-10-14' }, 't1');
  assert.equal(data.tasks.length, 1);
  assert.throws(() => addRecord(spec, data, 'tasks', { minutes: 5 }, 't2'), /Task is required/);
  assert.throws(
    () => addRecord(spec, data, 'tasks', { title: 'x', minutes: '5' }, 't2'),
    DataError,
  );
  assert.throws(() => addRecord(spec, data, 'tasks', { title: 'x', mood: 1 }, 't2'), /no field/);
  assert.throws(() => addRecord(spec, data, 'goals', { title: 'x', area: 'Fun' }, 'g1'), DataError);
  data = updateRecord(spec, data, 'tasks', 't1', { done: true });
  assert.deepEqual(data.tasks[0].values, {
    title: 'Run',
    minutes: 30,
    due: '2026-10-14',
    done: true,
  });
});

test('untrusted snapshots are rebuilt through the rules', () => {
  const spec = room(1);
  const good = { tasks: [{ id: 'a', values: { title: 'Read' }, createdAt: 'x' }], extra: [1] };
  assert.deepEqual(Object.keys(parseData(spec, good)), ['goals', 'tasks']);
  assert.throws(() => parseData(spec, { tasks: [{ id: 'a', values: { title: 7 } }] }), DataError);
});

test('tools follow capabilities and run through data rules', () => {
  const spec = room(1);
  const [coach, planner] = spec.characters;
  const names = (c = coach) => agentTools(spec, c).map((t) => t.name);
  assert.ok(names().includes('add_tasks') && names().includes('focus_panel'));
  assert.ok(!names(planner).includes('focus_panel'));
  const reader = { ...coach, capabilities: [] };
  assert.deepEqual(names(reader), ['list_goals', 'list_tasks']);

  let data = emptyData(spec);
  const add = runTool(
    spec,
    coach,
    data,
    { name: 'add_tasks', args: { title: 'Plan' } },
    () => 'n1',
  );
  assert.equal(add.response.recordId, 'n1');
  assert.equal(add.activity, '+ Tasks');
  data = add.data;
  const bad = runTool(
    spec,
    coach,
    data,
    { name: 'update_tasks', args: { recordId: 'zz' } },
    () => '',
  );
  assert.match(String(bad.response.error), /No Tasks record zz/);
  assert.equal(bad.data, data);
  const denied = runTool(
    spec,
    reader,
    data,
    { name: 'remove_tasks', args: { recordId: 'n1' } },
    () => '',
  );
  assert.match(String(denied.response.error), /not available/);
  const focus = runTool(
    spec,
    coach,
    data,
    { name: 'focus_panel', args: { panelId: 'minutes' } },
    () => '',
  );
  assert.equal(focus.focus, 'minutes');
  const listed = runTool(spec, reader, data, { name: 'list_tasks', args: {} }, () => '');
  assert.match(String(listed.response.records), /\[n1\] \{"title":"Plan"\}/);
});
