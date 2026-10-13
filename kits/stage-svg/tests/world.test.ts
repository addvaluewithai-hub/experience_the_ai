import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addRecord,
  agentTools,
  emptyData,
  runTool,
  validateRoom,
  worldBrief,
  type RoomSpec,
} from '@experience/room-spec';
import { createRoomStore } from '@experience/room-runtime';
import classroomRoom from '../../../examples/classroom-stage/room.json';
import classroomConfig from '../../../examples/classroom-stage/stage.json';
import spaceRoom from '../../../examples/space-trip/room.json';
import spaceConfig from '../../../examples/space-trip/stage.json';
import { parseStage, StageSurface, stageRoom, stageWorld, toCommand } from '../src/index.ts';

function entry(room: object, config: unknown) {
  const made = stageRoom(room as never, config);
  const result = validateRoom(made.spec);
  assert.ok(result.ok, JSON.stringify(!result.ok && result.errors));
  return { spec: result.spec, made };
}
const who = (spec: RoomSpec, id: string) => spec.characters.find((c) => c.id === id)!;
const run = (surface: StageSurface, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) surface.controller.step(1 / 60);
};

test('the kit declares its world; the engine only sees names and options', () => {
  const { spec } = entry(classroomRoom, classroomConfig);
  const world = spec.world!;
  assert.equal(world.surface, 'stage-svg');
  assert.match(
    world.describe,
    /^A classroom stage\.\nPlaces: board "السبورة": مكان الشرح \[board\] \(present\)/,
  );
  assert.deepEqual(
    world.actions.map((a) => a.name),
    ['go_to', 'play_routine', 'look_at', 'set_pose', 'perform'],
  );
  const routines = world.actions.find((a) => a.name === 'play_routine')!.params.routine.options;
  assert.ok(
    routines!.includes('present') && routines!.includes('read') && !routines!.includes('eat'),
  );
  assert.ok(world.actions.every((a) => a.silent));
});

test('only flyers get flying actions; walkers cannot walk into the sky', () => {
  const { spec } = entry(spaceRoom, spaceConfig);
  const names = agentTools(spec, who(spec, 'zeezo')).map((t) => t.name);
  assert.ok(
    names.includes('fly_to') && names.includes('fly_routine') && names.includes('follow_route'),
  );
  const go = spec.world!.actions.find((a) => a.name === 'go_to')!;
  assert.deepEqual(go.params.place.options, ['pad', 'base', 'flag-hill']);
  const classroom = entry(classroomRoom, classroomConfig).spec;
  assert.equal(
    agentTools(classroom, who(classroom, 'ms-nour')).some((t) => t.name === 'fly_to'),
    false,
  );
});

test('a bad stage config fails when the room is built, with its path', () => {
  const broken = structuredClone(classroomConfig) as any;
  broken.cast[0].at = 'roof';
  broken.cast[1].look.parts.hair = 'mohawk';
  broken.props[0].bind.on = 'shiny';
  let message = '';
  try {
    parseStage(classroomRoom as never, broken);
  } catch (error) {
    message = String(error);
  }
  assert.match(message, /stage\.cast\[0\]\.at: must name a place/);
  assert.match(message, /stage\.cast\[1\]\.look\.parts\.hair: must be one of/);
  assert.match(message, /stage\.props\[0\]\.bind\.on: must be one of clean, written/);
});

test('an accepted call becomes a rig command and the rig moves', () => {
  const { spec, made } = entry(classroomRoom, classroomConfig);
  const store = createRoomStore(spec);
  const surface = made.surface!(spec, store, spec.id) as StageSurface;
  const nour = who(spec, 'ms-nour');
  const outcome = runTool(
    spec,
    nour,
    store.get(),
    { name: 'play_routine', args: { routine: 'present' } },
    () => '',
  );
  assert.deepEqual(outcome.act, {
    character: 'ms-nour',
    action: 'play_routine',
    args: { routine: 'present' },
  });
  surface.act(outcome.act!.character, outcome.act!.action, outcome.act!.args);
  run(surface, 8);
  assert.match(surface.state(), /ms-nour \(مس نور\) standing at السبورة/);
  assert.equal(toCommand(surface.controller.stage, 'omar', 'look_at', { target: 'omar' }), null);
});

test('the state tells the truth from the data, and the brief carries it', () => {
  const { spec, made } = entry(classroomRoom, classroomConfig);
  const store = createRoomStore(spec);
  const surface = made.surface!(spec, store, spec.id) as StageSurface;
  assert.match(surface.state(), /Props: chalkboard \(board, clean\)/);
  store.set(addRecord(spec, emptyData(spec), 'ideas', { idea: 'شمس', shared: true }, 'i1'));
  assert.match(surface.state(), /omar \(عمر\) sitting at ديسك عمر.*chalkboard \(board, written\)/);
  const brief = worldBrief(spec, who(spec, 'omar'), surface.state());
  assert.match(
    brief,
    /A classroom stage\.[\s\S]*\nNow: .*sitting at ديسك عمر[\s\S]*world tools \(go_to, play_routine, look_at, set_pose, perform\)/,
  );
  assert.deepEqual(stageWorld(parseStage(spec, classroomConfig)), spec.world);
});
