import { validateRoom } from '../packages/room-spec/src/index.ts';
import { examples } from '../examples/index.ts';
import { rooms } from '../rooms/index.ts';

// Prints each room tree: built rooms (✓) with their characters and data, planned rooms (○)
// still to build, and any validation errors. `npm run rooms -- --examples` adds the examples.
const withExamples = process.argv.includes('--examples');
const entries = [...rooms, ...(withExamples ? examples : [])];
let failed = false;

function print(spec, path, depth) {
  const indent = '  '.repeat(depth);
  if (spec.planned) {
    console.log(`${indent}○ ${spec.icon ?? ''} ${spec.title}  [${path}]  planned: ${spec.purpose}`);
    return;
  }
  const people = spec.characters.map((c) => `${c.name} (${c.role})`).join(', ');
  const data = spec.collections.map((c) => `${c.id}: ${c.fields.map((f) => f.id).join(', ')}`);
  console.log(`${indent}✓ ${spec.icon ?? ''} ${spec.title}  [${path}]`);
  console.log(`${indent}    characters: ${people}`);
  console.log(`${indent}    data: ${data.join(' | ') || 'none'}`);
  console.log(`${indent}    panels: ${spec.panels.map((p) => `${p.id} (${p.kind})`).join(', ')}`);
  for (const inner of spec.rooms ?? []) print(inner, `${path}/${inner.id}`, depth + 1);
}

if (!entries.length) console.log('No rooms yet. Build the first one with docs/build-a-room.md.');
for (const entry of entries) {
  const result = validateRoom(entry.spec);
  if (!result.ok) {
    failed = true;
    console.log(`✗ ${entry.spec?.id ?? '(no id)'}\n  ${result.errors.join('\n  ')}`);
    continue;
  }
  print(result.spec, result.spec.id, 0);
}
process.exitCode = failed ? 1 : 0;
