import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { cubeFlightFlow } from './cube-flight-flow.mjs';

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
  // Scripted replies per character: a tool call first, words once its result comes back.
  const replies = {
    zeezo: [
      { text: 'هزرعلك شجرة!' },
      { functionCall: { name: 'add_habits', args: { name: 'شرب مية', done: true } } },
      { functionCall: { name: 'focus_panel', args: { panelId: 'planet' } } },
    ],
    guide: [
      { text: 'ده شغل الكرار.' },
      { functionCall: { name: 'open_room', args: { room: 'kitchen/pantry', note: 'ناقص رز' } } },
    ],
  };
  replies['ms-nour'] = [
    { text: 'تعالوا نشوف السبورة.' },
    { functionCall: { name: 'play_routine', args: { routine: 'present', at: 'board' } } },
    { functionCall: { name: 'look_at', args: { target: 'omar' } } },
  ];
  replies.unicorn = [
    { text: 'يلا نطير!' },
    { functionCall: { name: 'fly_to', args: { place: 'rainbow-bridge', speed: 1 } } },
  ];
  const answers = {
    unicorn: 'وصلنا الجسر ✨',
    zeezo: 'تمام يا بطل، الكوكب كبر!',
    guide: 'اتفضل على الكرار.',
    'ms-nour': 'شايفين؟ دي أول فكرة النهارده، وعمر عنده سؤال.',
  };
  await page.route('**/api/agent', (route) => {
    const request = route.request().postDataJSON();
    agentRequests.push(request);
    const last = request.turns.at(-1);
    const parts =
      last.role === 'user' && replies[request.characterId]
        ? replies[request.characterId]
        : [{ text: answers[request.characterId] ?? 'تمام، نكتب الرز.' }];
    return route.fulfill({ json: { parts } });
  });

  await page.goto(url);
  await assert.doesNotReject(page.getByRole('link', { name: /كوكب العادات/ }).waitFor());
  assert.equal(await page.locator('.card').count(), 10);
  await page.getByRole('link', { name: /وادي قوس قزح/ }).waitFor();
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });

  await cubeFlightFlow(page, url);

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

  // Rooms inside rooms: a world, doors, a planned room, the path back up and pulse rising.
  agentRequests.length = 0;
  await page.goto(`${url}/#/room/nested-house`);
  await page.getByRole('button', { name: 'ادخل: المطبخ, 0%' }).click();
  assert.equal(new URL(page.url()).hash, '#/room/nested-house/kitchen');
  await page.getByRole('textbox', { name: 'جديد: المهمة' }).fill('غسيل');
  await page.getByRole('button', { name: 'إضافة' }).click();
  await page.getByRole('checkbox', { name: 'غسيل' }).check();
  await page.getByRole('link', { name: 'مثال: بيت متداخل' }).click();
  await page.getByRole('button', { name: 'ادخل: المطبخ, 100%' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'الجنينة: قيد البناء' }).isDisabled(), true);
  await page.screenshot({ path: 'test-results/world.png', fullPage: true });

  // A character sends the person into an inner room; the character there picks up the note.
  await page.getByRole('textbox', { name: 'Message الدليل' }).fill('عايز رز');
  await page.keyboard.press('Enter');
  await page.waitForURL(/#\/room\/nested-house\/kitchen\/pantry$/);
  await page.getByText('↪ الدليل: ناقص رز').waitFor();
  await page.getByText('تمام، نكتب الرز.').waitFor();
  const [guideAsk, , keeperAsk] = agentRequests;
  assert.equal(guideAsk.below.kitchen.tasks.length, 1);
  assert.equal(keeperAsk.characterId, 'keeper');
  assert.match(
    keeperAsk.turns[0].text,
    /^HANDOFF from الدليل \(دليل البيت\) in "مثال: بيت متداخل": ناقص رز$/,
  );
  await page.getByRole('link', { name: 'مثال: بيت متداخل' }).click();
  await page.getByText('اتفضل على الكرار.').waitFor();
  assert.equal(agentRequests.length, 3, 'going back does not resend the handoff');

  // A stage: the character's tool calls move its body; the others listen while it talks.
  agentRequests.length = 0;
  await page.goto(`${url}/#/room/classroom-stage`);
  const teacher = page.locator('[data-character="ms-nour"]');
  await teacher.waitFor();
  assert.equal(await page.locator('[data-character="omar"]').getAttribute('data-pose'), 'sit');
  await page.getByRole('textbox', { name: 'Message مس نور' }).fill('اشرحي لنا');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => document.querySelector('[data-character="ms-nour"]')?.getAttribute('data-at') === 'board',
  );
  await page.getByText('شايفين؟ دي أول فكرة النهارده').waitFor();
  assert.equal(await teacher.getAttribute('data-mode'), 'speaking');
  assert.equal(
    await page.locator('[data-character="karim"]').getAttribute('data-mode'),
    'listening',
  );
  const [ask, answer] = agentRequests;
  assert.match(ask.world, /omar \(عمر\) sitting at ديسك عمر/);
  assert.deepEqual(
    answer.turns.at(-1).results.map((r) => r.response),
    [{ ok: true }, { ok: true }],
  );
  await page.screenshot({ path: 'test-results/classroom.png', fullPage: true });
  await page.getByRole('textbox', { name: 'جديد: الفكرة' }).fill('الشمس نجم');
  await page.getByRole('button', { name: 'إضافة' }).click();
  await page.getByRole('checkbox', { name: 'الشمس نجم' }).check();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-prop="chalkboard"]')?.getAttribute('data-state') === 'written',
  );

  // An immersive room: its own Phaser world on the whole screen, no forms; one tap begins, and
  // the keyboard stands in for voice. The unicorn flies when she is asked.
  agentRequests.length = 0;
  // Reduced motion keeps the arrival scene short; the way to begin waits until it has played.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${url}/#/room/rainbow-valley`);
  await page.locator('[data-world="rainbow-valley"][data-status="ready"] canvas').waitFor();
  assert.equal(await page.locator('.room, .room-bar, form').count(), 0, 'no page, no forms');
  assert.equal(await page.getByRole('button', { name: 'يلا نبدأ ✨' }).count(), 0, 'scene first');
  await page.getByRole('button', { name: 'يلا نبدأ ✨' }).waitFor();
  await page.getByRole('button', { name: 'جدّة القمر' }).waitFor();
  await page.getByRole('button', { name: 'كتابة بدل الصوت' }).click();
  const message = page.getByRole('textbox', { name: 'اكتب هنا… اليونيكورن' });
  for (const text of ['طيري للجسر', 'وصلنا؟']) {
    await message.fill(text);
    await page.keyboard.press('Enter');
    await page.getByText('وصلنا الجسر ✨').last().waitFor();
  }
  assert.match(agentRequests[0].world, /no name yet.*asleep on the grass at المرج \(meadow\)/);
  assert.deepEqual(
    agentRequests[1].turns.at(-1).results.map((r) => r.response),
    [{ ok: true }],
  );
  assert.match(agentRequests[2].world, /(flying to|hovering at) جسر قوس قزح \(rainbow-bridge\)/);
  await page.screenshot({ path: 'test-results/rainbow-valley.png', fullPage: true });
  // Into an inner place by asking: the valley unicorn flies down to the river, the river's
  // unicorn carries on from her note, and a brush told in words wakes a crystal.
  const day = new Date();
  const today = [day.getFullYear(), day.getMonth() + 1, day.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('-');
  const riverAsks = [];
  const river = (route) => {
    const request = route.request().postDataJSON();
    riverAsks.push(request);
    const last = request.turns.at(-1);
    const parts =
      last.role !== 'user'
        ? [{ text: request.room.id === 'rainbow-valley' ? 'يلا بينا!' : 'كريستالة الصبح صحيت! ✨' }]
        : request.room.id === 'rainbow-valley'
          ? [{ functionCall: { name: 'open_room', args: { room: 'crystal-river', note: 'سنان' } } }]
          : last.text.startsWith('HANDOFF')
            ? [{ text: 'غسلتي سنانك؟' }]
            : [{ functionCall: { name: 'add_brushes', args: { day: today, when: 'الصبح' } } }];
    return route.fulfill({ json: { parts } });
  };
  await page.route('**/api/agent', river);
  await message.fill('عايزة أغسل سناني');
  await page.keyboard.press('Enter');
  await page.waitForURL(/#\/room\/rainbow-valley\/crystal-river$/);
  await page.locator('[data-world="crystal-river"][data-status="ready"] canvas').waitFor();
  await page.getByText('غسلتي سنانك؟').waitFor();
  await page.getByRole('button', { name: 'كتابة بدل الصوت' }).click();
  await page.getByRole('textbox', { name: 'اكتب هنا… اليونيكورن' }).fill('غسلت سناني');
  await page.keyboard.press('Enter');
  await page.getByText('كريستالة الصبح صحيت! ✨').waitFor();
  const [handoff, told, after] = riverAsks.filter((r) => r.room.id === 'crystal-river');
  assert.match(handoff.turns[0].text, /^HANDOFF from اليونيكورن .*: سنان$/);
  assert.match(told.world, /\(0 of 3\)/);
  assert.match(after.world, /morning-crystal awake.*\(1 of 3\)/);
  assert.match(after.now.time, /^\d{2}:\d{2}$/);
  await page.screenshot({ path: 'test-results/crystal-river.png', fullPage: true });
  await page.unroute('**/api/agent', river);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // Several characters each keep their own conversation.
  await page.goto(`${url}/#/room/study-room`);
  await page.getByRole('tab', { name: 'سلمى' }).click();
  await page.getByText('جاهز لمراجعة سريعة؟').waitFor();
  assert.equal(await page.getByText('يلا نبدأ.').isVisible(), false);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const room of [
      'classroom-stage',
      'space-trip',
      'nested-house',
      'nested-house/kitchen',
      'kids-habit-planet',
      'self-growth-studio',
      'study-room',
      'rainbow-valley',
      'rainbow-valley/crystal-river',
      'cube-flight',
    ]) {
      await page.goto(`${url}/#/room/${room}`);
      await page.locator('.room, .immersive').first().waitFor();
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
  console.log(
    'Browser flow passed: rooms, nested rooms, handoff, panels, agent tool loop, characters, a Phaser world, 320/390/1280.',
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
