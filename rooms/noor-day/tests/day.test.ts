import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addRecord, agentTools, emptyData, validateRoom } from '@experience/room-spec';
import { createRoomStore } from '@experience/room-runtime';
import noorDay from '../index.ts';
import { describeDay, mealsOn, setToday, todayOf } from '../world/day.ts';
import { KitchenSurface } from '../world/surface.tsx';

function room() {
  const result = validateRoom(noorDay.spec);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return result.spec;
}
let n = 0;
const id = () => `r${++n}`;

test('an immersive kitchen: Noor lives in it, met by voice, no chat', () => {
  const spec = room();
  assert.equal(spec.layout, 'immersive');
  assert.equal(spec.presence, undefined, 'captions over the world, not a docked chat');
  assert.equal(spec.world!.arrival, 'arrival');
  assert.ok(spec.characters[0].persona.includes('بروكلي'), 'she knows the food list');
  const tools = agentTools(spec, spec.characters[0]).map((t) => t.name);
  assert.ok(
    ['add_days', 'update_days', 'add_meals', 'add_shopping', 'show'].every((t) =>
      tools.includes(t),
    ),
  );
});

test('today has one record: the first change creates it, the rest update it', () => {
  const spec = room();
  let data = emptyData(spec);
  data = setToday(spec, data, '2026-10-14', { water: 1 }, id);
  data = setToday(spec, data, '2026-10-14', { water: 2, gym: 'فكرت' }, id);
  data = setToday(spec, data, '2026-10-15', { vitamins: true }, id);
  assert.equal(data.days.length, 2);
  assert.deepEqual(todayOf(data, '2026-10-14')?.values, {
    day: '2026-10-14',
    water: 2,
    gym: 'فكرت',
  });
  assert.throws(() => setToday(spec, data, '2026-10-14', { gym: 'ركضت' }, id), /must be one of/);
});

test('the board in words: habits, the kitchen after nine, the week and the shopping', () => {
  const spec = room();
  let data = setToday(spec, emptyData(spec), '2026-10-14', { water: 3, vitamins: true }, id);
  for (const [day, meal, dish] of [
    ['2026-10-14', 'عشا', 'كوسة'],
    ['2026-10-14', 'فطار', 'بطاطس مهروسة'],
    ['2026-10-30', 'غدا', 'بعيد'],
  ])
    data = addRecord(spec, data, 'meals', { day, meal, dish }, id());
  data = addRecord(spec, data, 'shopping', { item: 'بطاطس', bought: true }, id());
  assert.deepEqual(
    mealsOn(data, '2026-10-14').map((m) => m.values.meal),
    ['فطار', 'عشا'],
  );
  const morning = describeDay(data, new Date(2026, 9, 14, 9, 0));
  assert.match(
    morning,
    /^Today \(2026-10-14\): water 3 of 8 glasses, vitamins taken, breakfast not ready, gym: nothing yet, kitchen closes at 9 pm\./,
  );
  assert.match(
    morning,
    /Week plan: 2 meals over the next 7 days, 0 done\. Shopping: 1 items, 1 bought\.$/,
  );
  assert.match(
    describeDay(data, new Date(2026, 9, 14, 22, 0)),
    /kitchen should be closed now \(after 9 pm\), not marked yet/,
  );
});

test('Noor walks, points and opens a fridge note; the kitchen reads itself to her', () => {
  const spec = room();
  const store = createRoomStore(spec);
  const surface = new KitchenSurface(spec, store, {
    reducedMotion: false,
    now: () => new Date(2026, 9, 14, 22, 0),
  });
  const model = surface.model;
  const wait = (seconds: number) => {
    for (let i = 0; i < seconds * 60; i++) model.step(1 / 60);
  };
  assert.match(
    surface.state(),
    /^noor \(نور\) at الشباك \(window\)\. It is night in the kitchen; the kitchen is closed\./,
  );
  let heard = 0;
  model.subscribe(() => heard++);
  surface.act('noor', 'show', { thing: 'shopping' });
  assert.equal(model.note, 'shopping');
  assert.equal(model.gesture, 'point');
  assert.equal(heard, 1);
  wait(3);
  assert.match(surface.state(), /at التلاجة \(fridge\).*The shopping note is open big\./);
  model.open(null);
  surface.act('noor', 'show', { thing: 'habits' });
  assert.equal(model.boardLit, true);
  wait(4);
  assert.equal(model.boardLit, false, 'the board lights for a moment');
  assert.match(surface.state(), /at السبورة \(chalkboard\)/);
  surface.act('noor', 'go_to', { place: 'roof' });
  surface.act('noor', 'gesture', { kind: 'cheer' });
  assert.equal(model.gesture, 'cheer');
  store.set(setToday(spec, store.get(), '2026-10-14', { water: 5 }, id));
  assert.match(surface.state(), /water 5 of 8 glasses/);
});

test('the arrival waits for its scene; a scene asked by Noor waits too', async () => {
  const spec = room();
  const surface = new KitchenSurface(spec, createRoomStore(spec), { reducedMotion: true });
  let arrived = false;
  const arrival = surface.play('arrival').then(() => (arrived = true));
  surface.act('noor', 'play_scene', { scene: 'kitchen-tour' });
  const asked = surface.model.takeScenes();
  assert.deepEqual(
    asked.map((s) => s.id),
    ['arrival', 'kitchen-tour'],
  );
  await Promise.resolve();
  assert.equal(arrived, false);
  asked[0].done();
  await arrival;
  assert.equal(arrived, true);
});
