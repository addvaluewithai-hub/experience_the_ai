import test from 'node:test';
import assert from 'node:assert/strict';
import { agentTools, parseData, runTool, validateRoom, type RoomSpec } from '@experience/room-spec';
import lifeHub from '../index';
import { observatoryData } from '../rooms/observatory/data';

function observatory(): RoomSpec {
  const result = validateRoom(lifeHub.spec);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.spec.rooms!.find((r) => r.id === 'observatory')!;
}
const goal = (id: string, status: string, extra: object = {}) => ({
  id,
  title: `Goal ${id}`,
  status,
  progress: 0.25,
  tasks: [],
  milestones: [],
  ...extra,
});

test('every LifeOS goal is one record of the observatory, by its id', () => {
  const spec = observatory();
  const data = parseData(
    spec,
    observatoryData([
      goal('a', 'active', { tasks: [{ status: 'completed' }, { status: 'ready' }] }),
      goal('b', 'archived', { target_date: '2026-09-01', created_at: '2026-07-01T10:00:00+00:00' }),
      goal('c', 'invented', { progress: 'lots' }),
      { title: 'no id' },
    ]),
  );
  assert.deepEqual(
    data.goals.map((g) => [g.id, g.values.state, g.values.progress]),
    [
      ['a', 'active', 25],
      ['b', 'archived', 25],
      ['c', undefined, undefined],
    ],
  );
  assert.equal(data.goals[0].values.open, 1);
  assert.equal(data.goals[1].values.target, '2026-09-01');
  assert.equal(data.goals[1].values.start, '2026-07-01', 'when it was added, without a start');
});

test('Orion decides through LifeOS, never deletes, and every change waits for a tap', () => {
  const spec = observatory();
  const orion = spec.characters[0];
  assert.equal(orion.name, 'Orion');
  const names = agentTools(spec, orion).map((t) => t.name);
  for (const name of ['create_goal', 'set_goal_status', 'focus_goal', 'show_view'])
    assert.ok(names.includes(name), name);
  assert.ok(!names.some((n) => n.includes('delete')), 'deleting stays the person’s own');
  assert.match(orion.persona, /Never act on a request at once/);
  assert.ok(!names.some((n) => /^(add|update|remove)_/.test(n)), 'no local data writes');
  const data = parseData(spec, observatoryData([goal('a', 'active')]));
  const call = (name: string, args: object) =>
    runTool(spec, orion, data, { name, args: args as Record<string, unknown> }, () => 'x').service;
  assert.equal(call('create_goal', { title: 'Run a marathon' })!.confirm, true);
  assert.equal(call('set_goal_status', { goal: 'a', status: 'paused' })!.confirm, true);
  assert.equal(call('set_goal_status', { goal: 'a', status: 'deleted' }), undefined);
});
