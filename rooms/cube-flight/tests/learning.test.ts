import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupBridge, afterBridgeChoice, canAdvanceLesson } from '../world/learning.ts';

test('every fact from 2 through 12 has a real nearby group bridge', () => {
  for (let table = 2; table <= 12; table++) {
    for (let other = 2; other <= 12; other++) {
      const bridge = groupBridge(table, other);
      assert.equal(bridge.base + (bridge.subtract ? -bridge.change : bridge.change), other);
      assert.ok(bridge.choices.includes(bridge.correct));
      assert.equal(bridge.choices.length, 3);
      assert.equal(new Set(bridge.choices).size, 3);
      assert.ok(bridge.question.includes(String(other)));
    }
  }
});

test('showing one result never advances; a real group choice unlocks hidden recall', () => {
  const bridge = groupBridge(3, 7);
  assert.equal(bridge.base, 5);
  assert.equal(bridge.correct, 2);
  assert.equal(afterBridgeChoice('explain', bridge, 2), 'explain');
  assert.equal(afterBridgeChoice('connect', bridge, 1), 'connect');
  assert.equal(afterBridgeChoice('connect', bridge, 2), 'recall');
  assert.equal(canAdvanceLesson('connect', 21, 21), false);
  assert.equal(canAdvanceLesson('recall', 22, 21), false);
  assert.equal(canAdvanceLesson('recall', 21, 21), true);
  assert.equal(canAdvanceLesson('recall', Number.NaN, 21), false);
});

test('9s bridge visually removes one group from 10, without teaching incorrect math', () => {
  const bridge = groupBridge(8, 9);
  assert.equal(bridge.base, 10);
  assert.equal(bridge.subtract, true);
  assert.equal(bridge.correct, 1);
  assert.match(bridge.equation, /−/);
});

test('invalid multiplication factors are rejected', () => {
  assert.throws(() => groupBridge(1, 7));
  assert.throws(() => groupBridge(8, 13));
  assert.throws(() => groupBridge(4.5, 7));
});
