import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// A docked room (يومي مع نور) against the built app and a scripted agent: the character speaks
// first on arrival, the person taps the board and talks, the character plans through its
// tools and brings a part of the board forward. It proves the client, not a real model.
const url = 'http://127.0.0.1:5192';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--config', 'apps/platform/vite.config.ts'].concat([
    '--host',
    '127.0.0.1',
    '--port',
    '5192',
    '--strictPort',
  ]),
  { stdio: 'ignore' },
);
await mkdir('test-results', { recursive: true });
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('-');
};

let browser;
try {
  for (const end = Date.now() + 15000; ; ) {
    if (
      await fetch(url)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    if (Date.now() > end) throw new Error('Preview did not start');
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const asks = [];
  const errors = [];
  for (const [width, height] of [
    [1280, 800],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/status', (route) => route.fulfill({ json: { ai: true } }));
    await page.route('**/api/agent', (route) => {
      const request = route.request().postDataJSON();
      asks.push(request);
      const last = request.turns.at(-1);
      const call = (name, args) => ({ functionCall: { name, args } });
      const parts =
        last.role !== 'user'
          ? [{ text: 'الخطة جاهزة 👇' }]
          : last.text.startsWith('ARRIVED')
            ? [{ text: 'صباح الخير، نبدأ بكوباية مية.' }]
            : [
                call('add_meals', { day: day(0), meal: 'غدا', dish: 'سلطة خس وخيار' }),
                call('add_meals', { day: day(1), meal: 'فطار', dish: 'بطاطس مهروسة' }),
                call('add_shopping', { item: 'بطاطس' }),
                call('show', { section: 'week' }),
              ];
      return route.fulfill({ json: { parts } });
    });
    asks.length = 0;
    await page.goto(`${url}/#/room/noor-day`);
    await page.getByText('صباح الخير، نبدأ بكوباية مية.').waitFor();
    assert.match(asks[0].turns[0].text, /^ARRIVED: the person just came into "يومي مع نور"/);
    assert.equal(
      await page.getByText('أنا نور. يلا نشوف اليوم').count(),
      0,
      'her own words, not the fixed greeting',
    );
    assert.equal(
      await page.locator('.room, .room-bar').count(),
      0,
      'a world, not a page of panels',
    );

    // The person's own taps go through the room's rules into today's one record.
    await page.getByRole('button', { name: '+ كوباية' }).click();
    await page.getByRole('button', { name: '+ كوباية' }).click();
    await page.getByRole('button', { name: 'فكرت' }).click();
    await page.getByText('٢ من ٨ كوبايات').waitFor();

    // Talking: the character plans through its tools and shows the week.
    await page.getByRole('textbox', { name: 'اكتب هنا… نور' }).fill('خططيلي الأسبوع');
    await page.keyboard.press('Enter');
    await page.getByText('الخطة جاهزة 👇').waitFor();
    await page.locator('section.plan[data-lit="true"]').waitFor();
    await page.getByRole('button', { name: /سلطة خس وخيار/ }).click();
    assert.equal(
      await page.getByRole('button', { name: /سلطة خس وخيار/ }).getAttribute('aria-pressed'),
      'true',
    );
    await page.getByText('+ خطة الأسبوع ×٢').waitFor();
    const [, plan] = asks;
    assert.match(plan.world, /^Today \(\d{4}-\d{2}-\d{2}\): water 2 of 8 glasses, .*gym: فكرت/);
    assert.equal(plan.data.days.length, 1, 'one record for the day');
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(wide, false, `no horizontal overflow at ${width}px`);
    await page.screenshot({ path: `test-results/noor-day-${width}.png` });
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    'Dock flow passed: arrival briefing, taps through room rules, tool planning, spotlight, 390/1280.',
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
