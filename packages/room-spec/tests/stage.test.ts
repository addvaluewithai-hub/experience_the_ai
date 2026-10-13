import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examples } from '../../../examples/index.ts';
import {
  addRecord,
  agentTools,
  emptyData,
  parseStageCall,
  propStateOf,
  runTool,
  stageBrief,
  stageOf,
  validateRoom,
  type RoomSpec,
} from '../src/index.ts';

const source = (id: string) =>
  structuredClone(examples.find((r) => (r.spec as { id: string }).id === id)!.spec) as any;
function room(id: string): RoomSpec {
  const result = validateRoom(source(id));
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return result.spec;
}
const who = (spec: RoomSpec, id: string) => spec.characters.find((c) => c.id === id)!;
const errorsOf = (value: unknown) => {
  const result = validateRoom(value);
  return result.ok ? '' : result.errors.join('\n');
};

test('looks get defaults and stages resolve every reference', () => {
  const spec = room('classroom-stage');
  const omar = who(spec, 'omar').look!;
  assert.deepEqual(omar.proportions, { head: 1, height: 1, build: 1 });
  assert.equal(omar.parts.hair, 'curly');
  const stage = stageOf(spec)!;
  assert.equal(stage.cast.length, 4);
  assert.deepEqual(
    stage.cast.find((c) => c.character === 'omar'),
    { character: 'omar', at: 'desk-1', pose: 'sit', facing: 'right' },
  );
});

test('stage mistakes are reported with their paths', () => {
  const bad = source('classroom-stage');
  const stage = bad.panels[0].stage;
  stage.cast[0].at = 'roof';
  stage.props[1].prop = 'piano';
  stage.props[0].bind.on = 'shiny';
  stage.places[0].affords = ['fly'];
  delete bad.characters[3].look;
  bad.characters[1].look.parts.hair = 'mohawk';
  const errors = errorsOf(bad);
  assert.match(errors, /stage\.cast\[0\]\.at: must name a place/);
  assert.match(errors, /stage\.props\[1\]\.prop: must be one of/);
  assert.match(errors, /stage\.props\[0\]\.bind\.on: must be one of clean, written/);
  assert.match(errors, /stage\.places\[0\]\.affords\[0\]/);
  assert.match(errors, /karim needs a look to stand on a stage/);
  assert.match(errors, /characters\[1\]\.look\.parts\.hair/);
  const twice = source('classroom-stage');
  twice.panels.push({ ...twice.panels[0], id: 'second' });
  assert.match(errorsOf(twice), /at most one stage/);
});

test('a jetpack is what lets a character fly', () => {
  const space = room('space-trip');
  const zeezo = who(space, 'zeezo');
  const tools = agentTools(space, zeezo);
  const go = tools.find((t) => t.name === 'go_to')!;
  assert.deepEqual((go.parameters.properties.how as { enum: string[] }).enum, [
    'walk',
    'run',
    'hop',
    'fly',
  ]);
  const routines = (
    tools.find((t) => t.name === 'play_routine')!.parameters.properties.routine as {
      enum: string[];
    }
  ).enum;
  assert.ok(routines.includes('launch') && routines.includes('orbit'));
  assert.ok(tools.some((t) => t.name === 'follow_route'));

  const classroom = room('classroom-stage');
  const nour = who(classroom, 'ms-nour');
  const her = agentTools(classroom, nour);
  const herRoutines = (
    her.find((t) => t.name === 'play_routine')!.parameters.properties.routine as { enum: string[] }
  ).enum;
  assert.ok(
    herRoutines.includes('present') &&
      herRoutines.includes('read') &&
      !herRoutines.includes('orbit'),
  );
  assert.ok(!herRoutines.includes('eat'), 'no place in the classroom offers eating');
  assert.equal(
    her.some((t) => t.name === 'follow_route'),
    false,
  );
});

test('stage calls are checked against the stage and the character', () => {
  const space = room('space-trip');
  const zeezo = who(space, 'zeezo');
  assert.deepEqual(parseStageCall(space, zeezo, 'go_to', { place: 'moon' }), {
    character: 'zeezo',
    type: 'go',
    place: 'moon',
    how: 'fly',
    speed: 0.5,
  });
  assert.deepEqual(parseStageCall(space, zeezo, 'go_to', { place: 'sun' }), {
    error: 'Unknown place',
  });
  const classroom = room('classroom-stage');
  const nour = who(classroom, 'ms-nour');
  assert.deepEqual(parseStageCall(classroom, nour, 'go_to', { place: 'board', how: 'fly' }), {
    error: 'You cannot fly',
  });
  assert.deepEqual(parseStageCall(classroom, nour, 'play_routine', { routine: 'present' }), {
    character: 'ms-nour',
    type: 'routine',
    routine: 'present',
    at: 'board',
  });
  assert.deepEqual(parseStageCall(classroom, nour, 'look_at', { target: 'omar' }), {
    character: 'ms-nour',
    type: 'look',
    target: 'omar',
  });
  assert.deepEqual(parseStageCall(classroom, nour, 'look_at', { target: 'ms-nour' }), {
    error: 'Unknown target',
  });
  const perform = parseStageCall(classroom, nour, 'perform', {
    expression: 'happy',
    gesture: 'moonwalk',
    intensity: 7,
  });
  assert.deepEqual(perform, {
    character: 'ms-nour',
    type: 'perform',
    expression: 'happy',
    gesture: 'none',
    intensity: 1,
    duration: 3,
  });
  const outcome = runTool(
    classroom,
    nour,
    emptyData(classroom),
    { name: 'go_to', args: { place: 'board' } },
    () => 'x',
  );
  assert.deepEqual(outcome.response, { ok: true });
  assert.equal(outcome.stage?.type, 'go');
});

test('prop states follow the room data, and the brief says what is true', () => {
  const classroom = room('classroom-stage');
  const board = stageOf(classroom)!.props.find((p) => p.id === 'chalkboard')!;
  let data = emptyData(classroom);
  assert.equal(propStateOf(board, data), 'clean');
  data = addRecord(classroom, data, 'ideas', { idea: 'شمس', shared: true }, 'i1');
  assert.equal(propStateOf(board, data), 'written');
  const today = { ...board, bind: { ...board.bind!, today: true } };
  assert.equal(propStateOf(today, data, '2001-01-01'), 'clean');

  const omar = who(classroom, 'omar');
  const brief = stageBrief(classroom, omar, { 'ms-nour': { at: 'board', pose: 'stand' } }, data);
  assert.match(brief, /You can walk, run, hop; you are sitting at ديسك عمر\./);
  assert.match(brief, /board "السبورة": مكان الشرح \[board\] \(present\)/);
  assert.match(brief, /desk-1 "ديسك عمر" \[desk\] \(sit, read\)/);
  assert.match(brief, /ms-nour \(مس نور, مدرسة\) standing at السبورة/);
  assert.match(brief, /chalkboard \(board, written\)/);
  assert.equal(stageBrief(classroom, { ...omar, id: 'nobody' }), '');
});
