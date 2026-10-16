import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRoomStore } from '@experience/room-runtime';
import type { RoomSpec, ServiceCall } from '@experience/room-spec';
import type { OpenRoom } from '../src/app/rooms.ts';
import { performCall, personRun } from '../src/app/services.ts';
import { currentAsk, readable } from '../src/features/room/confirm.ts';

const spec = {
  schemaVersion: 1,
  id: 'board',
  title: 'Board',
  purpose: 'p',
  language: 'en',
  theme: { preset: 'office', accent: '#334455' },
  characters: [],
  collections: [
    { id: 'goals', label: 'Goals', fields: [{ id: 'goal', label: 'Goal', type: 'text' }] },
  ],
  panels: [],
  services: [
    {
      source: 'lifeos.goals',
      actions: [
        {
          name: 'set_goal_status',
          label: 'Change a goal',
          description: 'd',
          params: { goal: { type: 'text' } },
          required: ['goal'],
          silent: false,
          confirm: true,
        },
      ],
    },
  ],
} as unknown as RoomSpec;
const store = createRoomStore(spec, {
  goals: [{ id: 'g1', createdAt: '', values: { goal: 'Launch the course' } }],
});
const room = { key: 'board', spec, store, panels: {}, example: false } as OpenRoom;
const call: ServiceCall = {
  source: 'lifeos.goals',
  action: 'set_goal_status',
  label: 'Change a goal',
  args: { goal: 'g1', status: 'paused' },
  confirm: true,
  character: 'orion',
};
const orion = {
  id: 'orion',
  name: 'Orion',
  role: 'Chair',
  persona: 'p',
  greeting: 'g',
  capabilities: [],
};

test('the person reads a goal by its title, not its id, before confirming', () => {
  assert.deepEqual(readable(call, store.get()), ['goal: Launch the course', 'status: paused']);
});

test('a confirmed call waits for the person; not now is an answer the character receives', async () => {
  const declined = performCall(room, orion, call);
  assert.equal(currentAsk()?.who, 'Orion');
  currentAsk()!.answer(false);
  assert.equal(((await declined) as { declined?: boolean }).declined, true);
  assert.equal(currentAsk(), null);

  const confirmed = performCall(room, orion, call);
  currentAsk()!.answer(true);
  // Signed out of LifeOS in this test: the source's real refusal comes back, nothing invented.
  assert.deepEqual(await confirmed, { error: 'Sign in to LifeOS first.' });

  const first = performCall(room, orion, call);
  const second = performCall(room, orion, call);
  assert.equal(((await first) as { declined?: boolean }).declined, true, 'one question at a time');
  currentAsk()!.answer(false);
  await second;
});

test('the person’s own taps pass the declared params and skip the card', async () => {
  assert.deepEqual(await personRun(room, 'drop_everything', {}), {
    error: 'drop_everything is not an action of this room',
  });
  assert.deepEqual(await personRun(room, 'set_goal_status', { goal: 'g1' }), {
    error: 'Sign in to LifeOS first.',
  });
  assert.equal(currentAsk(), null);
});
