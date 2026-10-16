import test from 'node:test';
import assert from 'node:assert/strict';
import { agentTools, emptyData, runTool, validateRoom } from '@experience/room-spec';
import lifeHub from '../index';

test('the Life Atrium validates with Work HQ and the observatory built', () => {
  const result = validateRoom(lifeHub.spec);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.spec.layout, 'immersive');
  const doors = result.spec.rooms ?? [];
  assert.deepEqual(
    doors.map((r) => r.id),
    ['work', 'learning', 'wellbeing', 'observatory'],
  );
  assert.deepEqual(
    doors.filter((r) => !r.planned).map((r) => r.id),
    ['work', 'observatory'],
  );
  const names = agentTools(result.spec, result.spec.characters[0]).map((t) => t.name);
  assert.ok(names.includes('open_room'));
  assert.ok(names.includes('spotlight_door'));
  const outcome = runTool(
    result.spec,
    result.spec.characters[0],
    emptyData(result.spec),
    {
      name: 'open_room',
      args: { room: 'learning', note: 'Please help me' },
    },
    () => 'ignored',
  );
  assert.deepEqual(outcome.response, { error: 'Give a known room and a note' });
});

test('Work HQ can add and complete a real task through its declared data tools', () => {
  const result = validateRoom(lifeHub.spec);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  const work = result.spec.rooms?.find((r) => r.id === 'work');
  assert.ok(work);
  const manager = work.characters[0];
  const added = runTool(
    work,
    manager,
    emptyData(work),
    {
      name: 'add_tasks',
      args: { task: 'Write the launch outline', priority: 'Now' },
    },
    () => 'task-1',
  );
  assert.equal(added.data.tasks.length, 1);
  const completed = runTool(
    work,
    manager,
    added.data,
    {
      name: 'update_tasks',
      args: { recordId: 'task-1', done: true },
    },
    () => 'unused',
  );
  assert.equal(completed.data.tasks[0].values.done, true);
});
