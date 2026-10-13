import assert from 'node:assert/strict';
import { test } from 'node:test';
import { innerRooms, runTool, validateRoom } from '@experience/room-spec';
import { createRoomStore } from '@experience/room-runtime';
import valley from '../index.ts';
import { awakeToday, localDay } from '../rooms/crystal-river/world/model.ts';
import { RiverSurface } from '../rooms/crystal-river/world/surface.tsx';
import { ValleySurface } from '../world/surface.tsx';

const TODAY = '2026-10-14';
function open() {
  const result = validateRoom(valley.spec);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  const top = result.spec;
  const spec = innerRooms(top).find((r) => r.path === 'crystal-river')!.spec;
  const store = createRoomStore(spec);
  const valleyStore = createRoomStore(top);
  const valleySurface = new ValleySurface(top, valleyStore, {
    reducedMotion: false,
    river: () => store.get(),
  });
  const surface = new RiverSurface(spec, store, {
    reducedMotion: false,
    name: () => valleySurface.model.nameOf(),
    today: () => TODAY,
  });
  const unicorn = spec.characters[0];
  const brush = (when: string, day = TODAY) => {
    const outcome = runTool(
      spec,
      unicorn,
      store.get(),
      { name: 'add_brushes', args: { day, when } },
      () => `b${Math.random()}`,
    );
    store.set(outcome.data);
    return outcome;
  };
  const wait = (seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) surface.model.step(1 / 60);
  };
  return { top, spec, store, surface, valleySurface, valleyStore, brush, wait };
}

test('the river is a built immersive room inside the valley, with its own data', () => {
  const { top, spec } = open();
  assert.equal(spec.layout, 'immersive');
  assert.equal(spec.world!.arrival, 'arrival');
  assert.deepEqual(
    spec.collections[0].fields.map((f) => f.id),
    ['day', 'when'],
  );
  assert.ok(
    top.world!.scenes!.some((s) => s.id === 'to-crystal-river'),
    'a staged way in',
  );
});

test('one crystal per time of day, today only; telling twice does not count twice', () => {
  const { surface, brush } = open();
  brush('الصبح', '2026-10-13');
  assert.equal(surface.model.awake().size, 0, 'yesterday sleeps again');
  brush('الصبح');
  brush('الصبح');
  assert.deepEqual([...surface.model.awake()], ['morning-crystal']);
  assert.match(
    surface.state(),
    /Crystals today: morning-crystal awake, noon-crystal asleep, night-crystal asleep \(1 of 3\)\.$/,
  );
  brush('الضهر');
  brush('بالليل');
  assert.match(surface.state(), /\(3 of 3\)\. The whole river shines in rainbow colours\.$/);
  assert.equal(awakeToday(undefined).size, 0);
  assert.match(localDay(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test('a crystal waking calls the unicorn to it with sparkles; all three, a big one', () => {
  const { surface, brush, wait } = open();
  wait(0.1);
  brush('بالليل');
  wait(0.1);
  assert.deepEqual(surface.model.takeMoments(), [
    { kind: 'sparkle', big: false, at: 'night-crystal' },
  ]);
  wait(8);
  assert.match(surface.state(), /hovering at كريستالة الليل \(night-crystal\)/);
  brush('الصبح');
  brush('الضهر');
  wait(0.1);
  assert.equal(surface.model.takeMoments().at(-1)?.big, true);
});

test('the unicorn is the valley one: her name, and the valley river wakes with the brushing', () => {
  const { top, surface, valleySurface, valleyStore, brush } = open();
  const named = runTool(
    top,
    top.characters[0],
    valleyStore.get(),
    { name: 'add_memories', args: { fact: 'لولو', kind: 'اسم اليونيكورن' } },
    () => 'm1',
  );
  valleyStore.set(named.data);
  assert.match(surface.state(), /^unicorn \(اليونيكورن, named "لولو" by Laila\)/);
  assert.match(valleySurface.state(), /The valley's colours are still asleep\.$/);
  brush('الصبح', localDay());
  assert.equal(valleySurface.model.brushedToday(), 1);
  assert.match(valleySurface.state(), /The crystal river is waking \(1 of 3 sparkles today\)/);
});
