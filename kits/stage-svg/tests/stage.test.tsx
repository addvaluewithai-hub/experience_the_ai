import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { addRecord, emptyData, validateRoom, type RoomSpec } from '@experience/room-spec';
import { examples } from '../../../examples/index.ts';
import classroomConfig from '../../../examples/classroom-stage/stage.json';
import spaceConfig from '../../../examples/space-trip/stage.json';
import { parseStage, project, Spring, StageController, StageView } from '../src/index.ts';

function room(id: string): RoomSpec {
  const result = validateRoom(examples.find((r) => (r.spec as { id: string }).id === id)!.spec);
  assert.ok(result.ok);
  return result.spec;
}
const configs: Record<string, unknown> = {
  'classroom-stage': classroomConfig,
  'space-trip': spaceConfig,
};
/** The example's stage, parsed by the kit against its room. */
const stageOf = (id: string) => parseStage(room(id), configs[id]);
/** Runs the stage for some seconds at 60 Hz. */
const run = (stage: StageController, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) stage.step(1 / 60);
};

test('springs settle the same at different frame rates', () => {
  const a = new Spring(0, 1, 8);
  const b = new Spring(0, 1, 8);
  for (let i = 0; i < 30; i++) a.step(1 / 30);
  for (let i = 0; i < 120; i++) b.step(1 / 120);
  assert.ok(Math.abs(a.value - b.value) < 0.01 && Math.abs(a.value - 1) < 0.01);
});

test('perspective: the back is higher and smaller; the air is above the floor', () => {
  const front = project({ x: 0.5, depth: 0 });
  const back = project({ x: 0.5, depth: 1 });
  const air = project({ x: 0.5, depth: 0, height: 0.5 });
  assert.ok(back.sy < front.sy && back.scale < front.scale && back.z < front.z);
  assert.ok(air.sy < front.sy && air.z > front.z);
});

test('characters walk to places, sit where a seat is and stand up to leave', () => {
  const stage = new StageController(stageOf('classroom-stage'));
  const start = stage.frames().get('omar')!;
  assert.equal(start.at, 'desk-1');
  assert.ok(start.sit > 0.99 && start.seat === 72, 'Omar starts sitting on the desk top');
  stage.dispatch({ character: 'omar', type: 'go', place: 'front', how: 'walk', speed: 0.6 });
  run(stage, 0.3);
  assert.equal(stage.frames().get('omar')!.at, 'desk-1', 'stands up before walking');
  run(stage, 12);
  const there = stage.frames().get('omar')!;
  assert.equal(there.at, 'front');
  assert.ok(there.sit < 0.05);
  stage.dispatch({ character: 'omar', type: 'pose', pose: 'sit' });
  run(stage, 2);
  assert.ok(stage.frames().get('omar')!.seat < 10, 'no seat at the front: he sits on the floor');
  assert.deepEqual(stage.positions().omar, { at: 'front', pose: 'sit' });
});

test('routines walk to the place they need; a route visits every stop', () => {
  const classroom = new StageController(stageOf('classroom-stage'));
  classroom.dispatch({ character: 'ms-nour', type: 'routine', routine: 'present', at: 'board' });
  run(classroom, 0.3);
  assert.equal(classroom.frames().get('ms-nour')!.at, null, 'on the way');
  run(classroom, 10);
  assert.equal(classroom.frames().get('ms-nour')!.at, 'board');

  const space = new StageController(stageOf('space-trip'));
  space.dispatch({ character: 'zeezo', type: 'route', route: 'grand-tour', speed: 1 });
  const seen = new Set<string>();
  let peak = 0;
  for (let i = 0; i < 60 * 40; i++) {
    space.step(1 / 60);
    const frame = space.frames().get('zeezo')!;
    if (frame.at) seen.add(frame.at);
    peak = Math.max(peak, frame.height);
  }
  assert.deepEqual([...seen], ['pad', 'moon', 'mars']);
  assert.ok(peak > 0.5, 'flew up to the planets');
  assert.equal(space.frames().get('zeezo')!.height, 0, 'landed back on the pad');
});

test('the speaker talks; the others listen and turn to them', () => {
  const stage = new StageController(stageOf('classroom-stage'));
  stage.speak('ms-nour');
  run(stage, 1.5);
  const frames = stage.frames();
  assert.equal(frames.get('ms-nour')!.mode, 'speaking');
  assert.equal(frames.get('karim')!.mode, 'listening');
  assert.ok(frames.get('karim')!.facing < -0.9, 'Karim, right of her, faces left to her');
  assert.ok(frames.get('omar')!.facing > 0.9, 'Omar, left of her, faces right');
  stage.speak(null);
  run(stage, 0.5);
  assert.equal(stage.frames().get('karim')!.mode, 'idle');
});

test('a stage renders its cast, seats and data-bound props', () => {
  const spec = room('classroom-stage');
  const stage = new StageController(stageOf('classroom-stage'));
  const data = addRecord(spec, emptyData(spec), 'ideas', { idea: 'قمر', shared: true }, 'a');
  const html = renderToStaticMarkup(
    <StageView spec={spec} controller={stage} data={data} title="الفصل" />,
  );
  for (const id of ['ms-nour', 'omar', 'laila', 'karim'])
    assert.ok(html.includes(`data-character="${id}"`));
  assert.match(html, /data-character="omar" data-at="desk-1" data-pose="sit"/);
  assert.match(html, /data-prop="chalkboard" data-state="written"/);
  assert.match(html, /aria-label="الفصل: مس نور: قدام السبورة، عمر: ديسك عمر/);
});

test('audible mouth frames drive the lips and fade when audio stops', () => {
  const stage = new StageController(stageOf('classroom-stage'));
  stage.mouth('ms-nour', { viseme: 'OH', open: 0.8, energy: 0.7 });
  run(stage, 0.05);
  const talking = stage.frames().get('ms-nour')!;
  assert.equal(talking.lips, 'OH');
  assert.ok(talking.mouth >= 0.8);
  run(stage, 0.4);
  const quiet = stage.frames().get('ms-nour')!;
  assert.equal(quiet.lips, null, 'a stale frame no longer moves the mouth');
  assert.ok(quiet.mouth < 0.2);
});
