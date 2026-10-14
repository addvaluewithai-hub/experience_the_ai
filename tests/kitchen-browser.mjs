import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Noor's kitchen (يومي مع نور) against the built app and a scripted agent: a world with a
// character and interface pinned to its things, met by voice with no chat. The arrival plays,
// the person ticks the chalkboard, Noor plans through her tools and opens a fridge note; on a
// phone the board and notes open from magnets. It proves the client, not a real model.
const url = 'http://127.0.0.1:5189';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--config', 'apps/platform/vite.config.ts'].concat([
    '--host',
    '127.0.0.1',
    '--port',
    '5189',
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
const call = (name, args) => ({ functionCall: { name, args } });

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
  const errors = [];
  for (const [width, height] of [
    [1280, 760],
    [390, 844],
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/status', (route) => route.fulfill({ json: { ai: true } }));
    const asks = [];
    await page.route('**/api/agent', (route) => {
      const request = route.request().postDataJSON();
      asks.push(request);
      const parts =
        request.turns.at(-1).role !== 'user'
          ? [{ text: 'الخطة على التلاجة 👇' }]
          : [
              call('add_meals', { day: day(0), meal: 'غدا', dish: 'سلطة خس وخيار' }),
              call('add_shopping', { item: 'بطاطس' }),
              call('show', { thing: 'week' }),
            ];
      return route.fulfill({ json: { parts } });
    });
    await page.goto(`${url}/#/room/noor-day`);
    await page.locator('[data-world="noor-kitchen"][data-status="ready"] canvas').waitFor();
    await page.getByRole('button', { name: 'يلا نبدأ ✨' }).waitFor();
    assert.equal(await page.locator('.dock, .room').count(), 0, 'no chat column, no page');
    const phone = width < 760;
    if (phone) await page.getByRole('button', { name: /^النهارده/ }).click();
    await page.getByRole('button', { name: 'كوباية ٢' }).click();
    await page.getByRole('checkbox', { name: /الفيتامينات/ }).click();
    await page.getByRole('button', { name: 'خططت' }).click();
    if (phone) await page.getByRole('button', { name: 'رجّعها على السبورة' }).click();
    await page.getByRole('button', { name: 'كتابة بدل الصوت' }).click();
    await page.getByRole('textbox').fill('خططيلي الأسبوع');
    await page.keyboard.press('Enter');
    await page.getByText('الخطة على التلاجة 👇').waitFor();
    const note = page.getByRole('article', { name: 'خطة الأسبوع' });
    await note.waitFor();
    await note.getByRole('checkbox', { name: /سلطة خس وخيار/ }).click();
    assert.equal(
      await note.getByRole('checkbox', { name: /سلطة خس وخيار/ }).getAttribute('aria-checked'),
      'true',
    );
    await page.screenshot({ path: `test-results/noor-kitchen-${width}.png` });
    await page.getByRole('button', { name: 'رجّعها على التلاجة' }).click();
    const [plan, after] = asks;
    assert.match(plan.world, /^noor \(نور\) at الشباك \(window\)/);
    assert.match(plan.world, /water 2 of 8 glasses, vitamins taken, .*gym: خططت/);
    assert.match(after.world, /The week plan note is open big\./);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(wide, false, `no horizontal overflow at ${width}px`);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    'Kitchen flow passed: arrival, a world with pinned interface, taps, tool planning, fridge note, magnets on phones, 390/1280.',
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
