import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, validateRoom } from '@experience/room-spec';
import cubeFlight from '../index.ts';
import { CubeModel } from '../world/model.ts';
import {
  canonical,
  dateOf,
  factKey,
  findFact,
  hintFor,
  pickTargets,
  recordAttempt,
  sessionPlan,
} from '../world/memory.ts';

function setup() {
  const result = validateRoom(cubeFlight.spec);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return result.spec;
}
let n = 0;
const id = () => `fact-${++n}`;
const day = '2026-10-15';

test('room is an immersive arcade with an original flying character and no agent scoring', () => {
  const spec = setup();
  assert.equal(spec.layout, 'immersive');
  assert.equal(spec.presence, undefined);
  assert.equal(spec.characters[0].id, 'lumi');
  assert.deepEqual(spec.characters[0].capabilities, []);
  assert.equal(spec.collections[0].fields.length, 8);
  assert.equal(spec.world?.surface, 'cube-flight-svg');
  const actions = spec.world?.actions?.map((action) => action.name) ?? [];
  assert.deepEqual(actions, ['fly_to', 'cheer', 'show_hint', 'reveal_array', 'advance', 'remember_player', 'name_companion']);
});

test('commutative prompts share one memory, and all questions stay within 2–12', () => {
  assert.deepEqual(canonical(9, 8), { a: 8, b: 9 });
  assert.equal(factKey(8, 9), factKey(9, 8));
  const questions = sessionPlan(emptyData(setup()), day);
  assert.equal(questions.length, 12);
  const keys = questions.map((q) => factKey(q.a, q.b));
  assert.equal(new Set(keys).size, 4);
  for (const key of new Set(keys)) {
    assert.equal(keys.filter((x) => x === key).length, 3);
    for (let i = 1; i < keys.length; i++)
      if (keys[i] === key) assert.notEqual(keys[i - 1], key, 'no immediate repeat');
  }
  assert.ok(questions.every((q) => q.a >= 2 && q.a <= 12 && q.b >= 2 && q.b <= 12));
});

test('a quick success on one day cannot pretend to be multi-day mastery', () => {
  const spec = setup();
  let data = emptyData(spec);
  data = recordAttempt(spec, data, 8, 9, { correct: true, helped: false }, day, id);
  data = recordAttempt(spec, data, 9, 8, { correct: true, helped: false }, day, id);
  assert.equal(data.facts.length, 1);
  assert.equal(findFact(data, 8, 9)?.values.attempts, 2);
  assert.equal(findFact(data, 9, 8)?.values.independent, 2);
  assert.equal(findFact(data, 8, 9)?.values.streak, 1);
  assert.equal(findFact(data, 8, 9)?.values.due, '2026-10-16');
  data = recordAttempt(spec, data, 8, 9, { correct: true, helped: false }, '2026-10-16', id);
  assert.equal(findFact(data, 8, 9)?.values.streak, 2);
  assert.equal(findFact(data, 8, 9)?.values.due, '2026-10-19');
  data = recordAttempt(spec, data, 9, 8, { correct: true, helped: false }, '2026-10-19', id);
  assert.equal(findFact(data, 8, 9)?.values.stage, 'strong');
});

test('a hint, reveal, or incorrect response does not count as independent recall', () => {
  const spec = setup();
  let data = emptyData(spec);
  data = recordAttempt(spec, data, 7, 8, { correct: true, helped: true }, day, id);
  assert.equal(findFact(data, 7, 8)?.values.independent, 0);
  assert.equal(findFact(data, 7, 8)?.values.streak, 0);
  data = recordAttempt(spec, data, 7, 8, { correct: false, helped: true }, day, id);
  assert.equal(findFact(data, 7, 8)?.values.attempts, 2);
  assert.equal(findFact(data, 7, 8)?.values.due, day);
  assert.equal(pickTargets(data, day)[0].a, 7);
  assert.equal(pickTargets(data, day)[0].b, 8);
});

test('review scheduling keeps not-yet-due facts aside while unseen facts remain', () => {
  const spec = setup();
  let data = emptyData(spec);
  data = recordAttempt(spec, data, 8, 9, { correct: true, helped: false }, day, id);
  const sameDay = pickTargets(data, day);
  assert.ok(sameDay.every((f) => factKey(f.a, f.b) !== '8x9'));
  const tomorrow = pickTargets(data, '2026-10-16');
  assert.equal(factKey(tomorrow[0].a, tomorrow[0].b), '8x9');
});

test('scaffolds help without replacing the need for recall', () => {
  assert.match(hintFor(8, 9), /10/);
  assert.match(hintFor(7, 8), /56/);
  assert.match(hintFor(6, 12), /10/);
  assert.match(dateOf(new Date(2026, 9, 15)), /^2026-10-15$/);
});

test('Lumi tools request safe game actions without writing answers or awarding points', () => {
  const model = new CubeModel();
  const commands: string[] = [];
  const stop = model.subscribeCommand(() => {
    const action = model.getCommand()?.action;
    if (action) commands.push(action);
  });
  model.act('lumi', 'show_hint', {});
  model.act('lumi', 'reveal_array', {});
  model.act('lumi', 'advance', {});
  model.act('someone-else', 'advance', {});
  assert.deepEqual(commands, ['hint', 'array', 'advance']);
  assert.match(model.state(), /do not guess correctness/);
  stop();
  model.act('lumi', 'advance', {});
  assert.equal(commands.length, 3, 'disposed listener receives no more commands');
});
