import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'tools/serve-api.mjs'], { stdio: 'inherit' }),
  spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--config', 'apps/platform/vite.config.ts'],
    { stdio: 'inherit' },
  ),
];
function stop() {
  for (const child of children) child.kill('SIGTERM');
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, stop);
for (const child of children) child.on('exit', () => stop());
