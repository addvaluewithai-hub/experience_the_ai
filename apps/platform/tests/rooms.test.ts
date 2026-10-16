import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadRooms } from '../src/app/rooms.ts';

const id = '11111111-aaaa-4bbb-8ccc-000000000000';
const goal = (title: string, extra: object = {}) => ({
  id,
  title,
  why: 'Because.',
  progress: 0.5,
  tasks: [{ id: 't1', title: 'First step', status: 'ready' }],
  ...extra,
});

test('records from a source open as rooms of the tree that asks for them', () => {
  const before = loadRooms();
  assert.ok(before.all.has('life-hub'));
  assert.ok(![...before.all.keys()].some((k) => k.startsWith('life-hub/g-')));
  assert.equal(before.all.get('life-hub')!.instances, 'lifeos.goals');

  const after = loadRooms({ 'lifeos.goals': [goal('Launch')] }, before.all);
  const room = after.all.get(`life-hub/g-${id}`)!;
  assert.deepEqual(room.source, { id: 'lifeos.goals', record: id });
  assert.equal(room.store.get().tasks[0].values.task, 'First step');
  assert.ok(room.surface, 'the goal room has its own surface');
  // Rooms already open keep their store and surface.
  const atrium = after.all.get('life-hub')!;
  assert.equal(atrium.store, before.all.get('life-hub')!.store);
  assert.equal(atrium.surface, before.all.get('life-hub')!.surface);
  assert.ok(atrium.spec.rooms!.some((r) => r.id === `g-${id}`));

  // Fresh records update an open goal room in place.
  const again = loadRooms(
    { 'lifeos.goals': [goal('Launch', { tasks: [{ id: 't9', title: 'Second step' }] })] },
    after.all,
  );
  const same = again.all.get(`life-hub/g-${id}`)!;
  assert.equal(same.store, room.store);
  assert.equal(same.store.get().tasks[0].values.task, 'Second step');
});

test('a source that would break the tree opens it without its rooms, never half-built', () => {
  const many = Array.from({ length: 9 }, (_, n) => ({
    ...goal(`Goal ${n}`),
    id: `${n}1111111-aaaa-4bbb-8ccc-000000000000`,
  }));
  const loaded = loadRooms({ 'lifeos.goals': many });
  assert.ok(loaded.all.has('life-hub'));
  assert.ok(![...loaded.all.keys()].some((k) => k.startsWith('life-hub/g-')));
  // A record a room cannot build is skipped on its own.
  const skipped = loadRooms({ 'lifeos.goals': [{ id: 'bad' }, goal('Fine')] });
  assert.equal([...skipped.all.keys()].filter((k) => k.startsWith('life-hub/g-')).length, 1);
});
