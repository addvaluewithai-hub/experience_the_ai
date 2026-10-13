import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agentTools, runTool, validateRoom, type RoomSpec } from '@experience/room-spec';
import { createRoomStore } from '@experience/room-runtime';
import valley from '../index.ts';
import { GROUND_IDS, PLACE_IDS } from '../world/places.ts';
import { ValleySurface } from '../world/surface.tsx';

function open() {
  const result = validateRoom(valley.spec);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  const spec = result.spec;
  const store = createRoomStore(spec);
  const surface = new ValleySurface(spec, store, { reducedMotion: false });
  const who = (id: string) => spec.characters.find((c) => c.id === id)!;
  const call = (character: string, name: string, args: object = {}) => {
    const outcome = runTool(
      spec,
      who(character),
      store.get(),
      { name, args: { ...args } },
      () => `r${Math.random()}`,
    );
    store.set(outcome.data);
    if (outcome.act) surface.act(outcome.act.character, outcome.act.action, outcome.act.args);
    return outcome;
  };
  const wait = (seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) surface.model.step(1 / 60);
  };
  return { spec, surface, who, call, wait };
}
const tools = (spec: RoomSpec, id: string) =>
  agentTools(spec, spec.characters.find((c) => c.id === id)!).map((t) => t.name);

test('the valley declares its own world; its places match what the scene draws', () => {
  const { spec } = open();
  assert.equal(spec.world!.surface, 'valley-phaser');
  const fly = spec.world!.actions.find((a) => a.name === 'fly_to')!;
  assert.deepEqual(fly.params.place.options, PLACE_IDS);
  assert.deepEqual(GROUND_IDS, ['crystal-river', 'meadow']);
  for (const id of PLACE_IDS) assert.ok(spec.world!.describe.includes(id), id);
  assert.ok(spec.world!.actions.every((a) => a.silent));
  assert.deepEqual(tools(spec, 'unicorn').slice(-5), [
    'fly_to',
    'land',
    'hover',
    'sparkle',
    'play_scene',
  ]);
  assert.deepEqual(tools(spec, 'moon-granny').slice(-2), ['twinkle_stars', 'play_scene']);
  assert.equal(spec.world!.arrival, 'arrival');
  assert.equal(tools(spec, 'moon-granny').includes('fly_to'), false);
});

test('she sleeps until the first words, then wakes and flies close to Laila', () => {
  const { surface, wait } = open();
  assert.match(
    surface.state(),
    /^unicorn \(اليونيكورن, no name yet: Laila has not chosen one\) asleep on the grass at المرج/,
  );
  surface.speak('moon-granny');
  assert.equal(surface.model.asleep, true, 'Grandma Moon does not wake her');
  surface.speak('unicorn');
  assert.equal(surface.model.asleep, false);
  assert.deepEqual(surface.model.takeMoments(), [{ kind: 'wake' }]);
  wait(0.5);
  assert.match(surface.state(), /waking up and flying to قدام ليلى \(near-laila\)/);
  wait(10);
  assert.match(surface.state(), /hovering at قدام ليلى \(near-laila\)/);
});

test('the name Laila chooses is remembered and read back from the valley', () => {
  const { surface, call } = open();
  assert.equal(surface.model.nameOf(), null);
  call('unicorn', 'add_memories', { fact: '  سكّرة  ', kind: 'اسم اليونيكورن' });
  call('unicorn', 'add_memories', { fact: 'بنفسجي', kind: 'لون مفضل' });
  assert.equal(surface.model.nameOf(), 'سكّرة');
  assert.match(surface.state(), /unicorn \(اليونيكورن, named "سكّرة" by Laila\)/);
});

test('the director plays scenes on request; arrival waits until it has played', async () => {
  const { surface, call } = open();
  let arrived = false;
  const arrival = surface.play('arrival').then(() => (arrived = true));
  call('moon-granny', 'play_scene', { scene: 'name-in-stars' });
  const asked = surface.model.takeScenes();
  assert.deepEqual(
    asked.map((s) => s.id),
    ['arrival', 'name-in-stars'],
  );
  await Promise.resolve();
  assert.equal(arrived, false);
  asked[0].done();
  await arrival;
  assert.equal(arrived, true);
  assert.equal(surface.model.asleep, true, 'a scene does not wake her');
});

test('the unicorn flies where she is asked, and the valley says where she is', () => {
  const { surface, call, wait } = open();
  assert.deepEqual(call('unicorn', 'fly_to', { place: 'rainbow-bridge', speed: 0.9 }).response, {
    ok: true,
  });
  wait(0.5);
  assert.match(surface.state(), /flying to جسر قوس قزح \(rainbow-bridge\)/);
  wait(12);
  assert.match(surface.state(), /hovering at جسر قوس قزح \(rainbow-bridge\)/);
  call('unicorn', 'fly_to', { place: 'crystal-river', path: 'swoop' });
  wait(16);
  assert.match(surface.state(), /resting on the grass at نهر الكريستال \(crystal-river\)/);
  assert.equal(surface.model.flight.state().landed, true);
  assert.match(String(call('unicorn', 'fly_to', { place: 'moon' }).response.error), /one of/);
});

test('moments wait for the scene, a few at most, and only who may act can act', () => {
  const { surface, call } = open();
  for (let i = 0; i < 5; i++) call('unicorn', 'sparkle', { big: i === 4 });
  call('moon-granny', 'twinkle_stars');
  assert.deepEqual(surface.model.takeMoments(), [
    { kind: 'sparkle', big: false },
    { kind: 'sparkle', big: true },
    { kind: 'twinkle' },
  ]);
  assert.deepEqual(surface.model.takeMoments(), []);
  assert.match(String(call('unicorn', 'twinkle_stars').response.error), /not available/);
});

test('whoever speaks holds the floor; lips follow only the audible frame', () => {
  const { surface } = open();
  surface.speak('moon-granny');
  assert.equal(surface.speaking, 'moon-granny');
  assert.equal(surface.model.modeOf('moon-granny'), 'speaking');
  assert.equal(surface.model.modeOf('unicorn'), 'listening');
  assert.match(surface.state(), /جدّة القمر is speaking/);
  surface.mouth('moon-granny', { viseme: 'AA', open: 0.8, energy: 0.6 });
  assert.equal(surface.model.mouthOf('moon-granny')?.open, 0.8);
  surface.mouth('moon-granny', null);
  surface.speak(null);
  assert.equal(surface.model.mouthOf('moon-granny'), null);
  assert.equal(surface.model.modeOf('unicorn'), 'idle');
});
