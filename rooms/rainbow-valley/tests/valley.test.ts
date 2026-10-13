import assert from 'node:assert/strict';
import { test } from 'node:test';
import { agentTools, emptyData, runTool, validateRoom, type RoomSpec } from '@experience/room-spec';
import valley from '../index.ts';
import { GROUND_IDS, PLACE_IDS } from '../world/places.ts';
import { ValleySurface } from '../world/surface.tsx';

function open() {
  const result = validateRoom(valley.spec);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  const spec = result.spec;
  const surface = new ValleySurface(spec, { reducedMotion: false });
  const who = (id: string) => spec.characters.find((c) => c.id === id)!;
  const call = (character: string, name: string, args: object = {}) => {
    const outcome = runTool(
      spec,
      who(character),
      emptyData(spec),
      { name, args: { ...args } },
      () => '',
    );
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
  assert.deepEqual(tools(spec, 'unicorn').slice(-4), ['fly_to', 'land', 'hover', 'sparkle']);
  assert.ok(tools(spec, 'moon-granny').includes('twinkle_stars'));
  assert.equal(tools(spec, 'moon-granny').includes('fly_to'), false);
});

test('the unicorn flies where she is asked, and the valley says where she is', () => {
  const { surface, call, wait } = open();
  assert.match(surface.state(), /^unicorn \(اليونيكورن\) resting on the grass at المرج \(meadow\)/);
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
