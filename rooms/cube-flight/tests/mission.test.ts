import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, validateRoom } from '@experience/room-spec';
import cubeFlight from '../index.ts';
import { canonical, factKey, findFact, recordAttempt } from '../world/memory.ts';
import { dailyMission, learningAnchor, recommendTable } from '../world/mission.ts';

const validated = validateRoom(cubeFlight.spec);
if (!validated.ok) throw new Error(JSON.stringify(validated.errors));
const spec = validated.spec;
const day = '2026-10-15';
let serial = 0;
const id = () => `mission-${++serial}`;

test('first visit gently recommends table two, but every table from 2 to 12 can be selected', () => {
  const data = emptyData(spec);
  assert.equal(recommendTable(data), 2);
  for (let table = 2; table <= 12; table++) {
    const mission = dailyMission(data, table, day);
    assert.equal(mission.table, table);
    assert.equal(mission.lessons.length, 3);
    assert.ok(mission.lessons.every(({ a, answer, b }) => a === table && a * b === answer));
    assert.equal(mission.questions.length, 9);
    assert.equal(new Set(mission.lessons.map(({ a, b }) => factKey(a, b))).size, 3);
    for (const key of new Set(mission.questions.map(({ a, b }) => factKey(a, b)))) {
      assert.equal(mission.questions.filter(({ a, b }) => factKey(a, b) === key).length, 3);
    }
  }
});

test('first teaches visible answers as cube group relationships, then recall prompts hide them', () => {
  const mission = dailyMission(emptyData(spec), 3, day);
  assert.deepEqual(mission.lessons.map((fact) => fact.b), [6, 7, 8]);
  assert.match(mission.lessons[0].anchor, /3 × 5 = 15/);
  assert.equal(mission.lessons[0].answer, 18);
  assert.match(learningAnchor(8, 9), /10/);
  assert.equal(mission.questions[0].a * mission.questions[0].b, 18);
});

test('due facts from another table join the mixed quiz; learning itself never writes mastery', () => {
  let data = emptyData(spec);
  data = recordAttempt(spec, data, 9, 12, { correct: false, helped: true }, day, id);
  const remembered = findFact(data, 9, 12);
  const mission = dailyMission(data, 3, day);
  assert.equal(remembered?.values.independent, 0);
  assert.ok(mission.questions.some((q) => factKey(q.a, q.b) === factKey(9, 12)));
  assert.ok(mission.lessons.every((fact) => fact.a === 3));
  assert.equal(data.facts.length, 1, 'building a lesson never records a successful recall');
});

test('weak/due table facts come before already strong facts', () => {
  let data = emptyData(spec);
  const b = canonical(2, 12);
  data = recordAttempt(spec, data, b.a, b.b, { correct: false, helped: true }, day, id);
  const mission = dailyMission(data, 2, day);
  assert.equal(mission.lessons[0].b, 12);
});

test('invalid selected tables are rejected rather than inventing arithmetic', () => {
  const data = emptyData(spec);
  assert.throws(() => dailyMission(data, 1, day));
  assert.throws(() => dailyMission(data, 13, day));
  assert.throws(() => dailyMission(data, 3.5, day));
});
