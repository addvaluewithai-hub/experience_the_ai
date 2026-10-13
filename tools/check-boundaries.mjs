import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
/** Bare imports each area may use. Relative imports must stay inside the area. */
const areas = [
  { path: 'packages/room-spec/src', allowed: [] },
  { path: 'packages/room-runtime/src', allowed: ['react', 'react-dom', '@experience/room-spec'] },
  // Each room folder is self-contained content: base components only, no app or server code.
  {
    path: 'rooms',
    perFolder: true,
    allowed: ['react', '@experience/room-spec', '@experience/room-runtime'],
  },
  {
    path: 'examples',
    perFolder: true,
    allowed: ['react', '@experience/room-spec', '@experience/room-runtime'],
  },
];
const excluded = new Set([
  '.git',
  'node_modules',
  'dist',
  'test-results',
  '.functions-check',
  '.wrangler',
]);
const generated = new Set(['package-lock.json']);
const sourceExtensions = /\.(?:tsx?|mjs|css|json|ya?ml|md|html)$/;
const errors = [];
let count = 0;
let largest = { path: '', lines: 0 };

function areaOf(path) {
  for (const area of areas) {
    const base = resolve(root, area.path);
    if (!path.startsWith(base + sep)) continue;
    if (!area.perFolder) return { base, allowed: area.allowed };
    const [folder] = relative(base, path).split(sep);
    // The registry file sits beside the room folders and may import each of them.
    return { base: folder.includes('.') ? base : resolve(base, folder), allowed: area.allowed };
  }
}

async function scan(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (excluded.has(item.name)) continue;
    const path = resolve(folder, item.name);
    if (item.isSymbolicLink()) {
      errors.push(`Unexpected symlink: ${relative(root, path)}`);
      continue;
    }
    if (item.isDirectory()) {
      await scan(path);
      continue;
    }
    const name = relative(root, path).split(sep).join('/');
    if (!sourceExtensions.test(name) || generated.has(name)) continue;
    const content = await readFile(path, 'utf8');
    const lines = content.trimEnd().split('\n').length;
    count++;
    if (lines > largest.lines) largest = { path: name, lines };
    if (lines > 300) errors.push(`${name}: ${lines} lines (limit 300)`);
    if (!/\.tsx?$/.test(name)) continue;
    const imports = [...content.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)];
    for (const [, specifier] of imports)
      if (/packages\/[^/]+\/src/.test(specifier))
        errors.push(`${name}: import packages through their exports, not ${specifier}`);
    const area = areaOf(path);
    if (!area || name.includes('/tests/')) continue;
    for (const [, specifier] of imports) {
      if (specifier.startsWith('.')) {
        if (!resolve(dirname(path), specifier).startsWith(area.base + sep))
          errors.push(`${name}: import escapes its area: ${specifier}`);
      } else if (!area.allowed.some((a) => specifier === a || specifier.startsWith(`${a}/`))) {
        errors.push(`${name}: cannot depend on ${specifier}`);
      }
    }
  }
}

await scan(root);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Boundaries and 300-line limit passed: ${count} authored files. Largest: ${largest.path} (${largest.lines}).`,
  );
}
