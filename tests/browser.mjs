import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Built app + mocked API: this checks rooms, panels and the agent tool loop in a real browser.
// It does not prove a real model's behaviour; that needs a live check on a preview deployment.
const url = 'http://127.0.0.1:5191';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--config', 'apps/platform/vite.config.ts'].concat([
    '--host',
    '127.0.0.1',
    '--port',
    '5191',
    '--strictPort',
  ]),
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let logs = '';
server.stdout.on('data', (d) => (logs += d));
server.stderr.on('data', (d) => (logs += d));
await mkdir('test-results', { recursive: true });

async function noOverflow(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(wide, false, `${label}: no horizontal overflow`);
}

let browser;
try {
  for (const end = Date.now() + 15000; ; ) {
    if (server.exitCode !== null) throw new Error(logs);
    if (
      await fetch(url)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    if (Date.now() > end) throw new Error(`Preview did not start\n${logs}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let ai = true;
  const agentRequests = [];
  await page.route('**/api/status', (route) => route.fulfill({ json: { ai } }));
  await page.route('**/api/agent', (route) => {
    const request = route.request().postDataJSON();
    agentRequests.push(request);
    const parts =
      agentRequests.length === 1
        ? [
            { text: 'هزرعلك شجرة!' },
            { functionCall: { name: 'add_habits', args: { name: 'شرب مية', done: true } } },
            { functionCall: { name: 'focus_panel', args: { panelId: 'planet' } } },
          ]
        : [{ text: 'تمام يا بطل، الكوكب كبر!' }];
    return route.fulfill({ json: { parts } });
  });

  await page.goto(url);
  await assert.doesNotReject(page.getByRole('link', { name: /كوكب العادات/ }).waitFor());
  assert.equal(await page.locator('.card').count(), 3);
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });

  // A person's own edits go through the room rules and every panel agrees.
  await page.getByRole('link', { name: /كوكب العادات/ }).click();
  assert.equal(await page.locator('.room').getAttribute('dir'), 'rtl');
  await page.getByRole('textbox', { name: 'جديد: العادة' }).fill('ترتيب السرير');
  await page.getByRole('button', { name: 'إضافة' }).click();
  await page.getByRole('checkbox', { name: 'ترتيب السرير' }).check();
  assert.equal(await page.locator('.room-plant').count(), 1);
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100');

  // The character acts through its tools; results return to it before it answers.
  await page.getByText('أهلًا يا بطل!').waitFor();
  await page.getByRole('textbox', { name: 'Message زيزو' }).fill('شربت مية');
  await page.keyboard.press('Enter');
  await page.getByText('تمام يا بطل، الكوكب كبر!').waitFor();
  assert.equal(await page.locator('.room-plant').count(), 2);
  assert.equal(await page.getByRole('checkbox', { name: 'شرب مية' }).isChecked(), true);
  await page.getByText('+ عادات النهارده').waitFor();
  assert.equal(await page.locator('#panel-planet').getAttribute('data-focus'), 'true');
  assert.equal(agentRequests.length, 2);
  assert.equal(agentRequests[0].room.id, 'kids-habit-planet');
  assert.equal(agentRequests[0].data.habits.length, 1);
  const toolTurn = agentRequests[1].turns.at(-1);
  assert.equal(toolTurn.role, 'tool');
  assert.deepEqual(
    toolTurn.results.map((r) => [r.name, r.response.ok]),
    [
      ['add_habits', true],
      ['focus_panel', true],
    ],
  );
  assert.equal(agentRequests[1].data.habits.length, 2);
  await page.screenshot({ path: 'test-results/kids-room.png', fullPage: true });

  // Several characters each keep their own conversation.
  await page.goto(`${url}/#/room/study-room`);
  await page.getByRole('tab', { name: 'سلمى' }).click();
  await page.getByText('جاهز لمراجعة سريعة؟').waitFor();
  assert.equal(await page.getByText('يلا نبدأ.').isVisible(), false);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const room of ['kids-habit-planet', 'self-growth-studio', 'study-room']) {
      await page.goto(`${url}/#/room/${room}`);
      await page.locator('.room').waitFor();
      await noOverflow(page, `${room} at ${width}px`);
    }
    await page.screenshot({ path: `test-results/studio-${width}.png`, fullPage: true });
  }

  // When the AI is closed the page says so and does not offer a dead input.
  ai = false;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${url}/#/room/self-growth-studio`);
  await page.reload();
  await page.getByText('Characters are not live on this deployment yet.').waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Message Maya' }).isDisabled(), true);

  assert.deepEqual(errors, []);
  console.log('Browser flow passed: rooms, panels, agent tool loop, characters, 320/390/1280.');
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
