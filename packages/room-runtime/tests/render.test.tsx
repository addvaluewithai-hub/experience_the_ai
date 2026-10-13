import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { addRecord, emptyData, validateRoom, type RoomSpec } from '@experience/room-spec';
import { examples as rooms } from '../../../examples/index.ts';
const exampleRooms = ['kids-habit-planet', 'self-growth-studio', 'study-room'].map(
  (id) => rooms.find((r) => (r.spec as { id: string }).id === id)!.spec,
);
import { createRoomStore, RoomView } from '../src/index.ts';

function room(index: number): RoomSpec {
  const result = validateRoom(exampleRooms[index]);
  assert.ok(result.ok);
  return result.spec;
}

test('every example room renders each panel with its theme and direction', () => {
  for (const index of exampleRooms.keys()) {
    const spec = room(index);
    const html = renderToStaticMarkup(<RoomView spec={spec} store={createRoomStore(spec)} />);
    assert.match(html, new RegExp(`data-theme="${spec.theme.preset}"`));
    assert.match(html, new RegExp(`dir="${spec.language === 'ar' ? 'rtl' : 'ltr'}"`));
    for (const panel of spec.panels) assert.ok(html.includes(`id="panel-${panel.id}"`));
  }
});

test('panels read the same data: growth, progress and list agree', () => {
  const spec = room(0);
  let data = emptyData(spec);
  for (const [i, name] of ['ماء', 'أسنان', 'قراءة', 'رياضة'].entries())
    data = addRecord(spec, data, 'habits', { name, done: i < 3 }, `h${i}`);
  const html = renderToStaticMarkup(
    <RoomView spec={spec} store={createRoomStore(spec, data)} focus="planet" />,
  );
  assert.equal(html.match(/class="room-plant"/g)?.length, 3);
  assert.match(html, /aria-valuenow="75"/);
  assert.match(html, /<strong>نبتة<\/strong> · 3 من 4/);
  assert.equal(html.match(/type="checkbox" aria-label="[^"]+" checked=""/g)?.length, 3);
  assert.match(html, /id="panel-planet"[^>]*data-focus="true"/);
});

test('stat panel sums its number field', () => {
  const spec = room(1);
  let data = emptyData(spec);
  data = addRecord(spec, data, 'tasks', { title: 'A', minutes: 25 }, 'a');
  data = addRecord(spec, data, 'tasks', { title: 'B', minutes: 50 }, 'b');
  const html = renderToStaticMarkup(<RoomView spec={spec} store={createRoomStore(spec, data)} />);
  assert.match(html, /<strong>75<\/strong><span>Minutes<\/span>/);
});

test('custom panels come from the room registry; a missing one says so', () => {
  const spec = room(1);
  const panels = [
    { id: 'board', kind: 'custom' as const, title: 'Board', component: 'vision-board' },
    { id: 'gone', kind: 'custom' as const, title: 'Gone', component: 'not-installed' },
  ];
  const checked = validateRoom({ ...spec, panels: [...spec.panels, ...panels] });
  assert.ok(checked.ok);
  const custom = {
    'vision-board': ({ data }: { data: Record<string, unknown[]> }) => (
      <p>tasks:{data.tasks.length}</p>
    ),
  };
  const html = renderToStaticMarkup(
    <RoomView spec={checked.spec} store={createRoomStore(checked.spec)} custom={custom} />,
  );
  assert.match(html, /<p>tasks:0<\/p>/);
  assert.match(html, /component is not installed/);
  assert.equal(
    validateRoom({ ...spec, panels: [{ ...panels[0], component: 'Bad Id' }] }).ok,
    false,
  );
});

test('a world shows inner rooms lit by their pulse, planned ones as closed doors', () => {
  const result = validateRoom(rooms[0].spec);
  assert.ok(result.ok);
  const house = result.spec;
  const kitchen = house.rooms!.find((r) => r.id === 'kitchen')!;
  let tasks = emptyData(kitchen);
  tasks = addRecord(kitchen, tasks, 'tasks', { task: 'غسيل', done: true }, 'a');
  const world = { dataAt: (path: string) => (path === 'kitchen' ? tasks : undefined), open() {} };
  const html = renderToStaticMarkup(
    <RoomView spec={house} store={createRoomStore(house)} world={world} />,
  );
  assert.match(html, /<svg class="room-world-ground"/);
  assert.match(html, /data-lit="true"[^>]*aria-label="ادخل: المطبخ, 100%"/);
  assert.match(html, /data-planned="true" disabled=""[^>]*aria-label="الجنينة: قيد البناء"/);
  const inner = renderToStaticMarkup(
    <RoomView spec={kitchen} store={createRoomStore(kitchen, tasks)} world={world} />,
  );
  assert.match(inner, /class="room-doors"/);
  assert.match(inner, /aria-label="ادخل: الكرار, 0%"/);
});
