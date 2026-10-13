import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';
import { handleRequest } from '../apps/platform/server/app.ts';

// Local stand-in for Pages Functions: wrangler vars, overridden by an untracked .dev.vars.
const config = parse(await readFile('wrangler.jsonc', 'utf8'));
let local = '';
try {
  local = await readFile('.dev.vars', 'utf8');
} catch {}
const localVars = Object.fromEntries(
  local
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
const env = { ...config.vars, ...localVars };
const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await handleRequest(request, env);
    res.statusCode = response.status;
    for (const [key, value] of response.headers) res.setHeader(key, value);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Something went wrong.' }));
  }
});
server.listen(8787, '127.0.0.1', () => console.log('API on http://127.0.0.1:8787'));
process.on('SIGTERM', () => server.close());
