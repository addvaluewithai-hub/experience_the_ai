import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// A voice call against a scripted Gemini Live socket: real audio playback in Chromium, a fake
// microphone, mouth frames from the played PCM, and a stage tool during speech. It proves the
// client pipeline, not a real model or a real phone (those need a live check).
const url = 'http://127.0.0.1:5193';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--config', 'apps/platform/vite.config.ts'].concat([
    '--host',
    '127.0.0.1',
    '--port',
    '5193',
    '--strictPort',
  ]),
  { stdio: 'ignore' },
);
await mkdir('test-results', { recursive: true });

/** Syllables of a 750 Hz vowel with silent gaps, as 24 kHz PCM chunks in base64. */
function speech(seconds) {
  const rate = 24000;
  const chunks = [];
  for (let start = 0; start < seconds * rate; start += rate * 0.2) {
    const bytes = Buffer.alloc(rate * 0.2 * 2);
    for (let i = 0; i < rate * 0.2; i++) {
      const t = (start + i) / rate;
      const voiced = t % 0.4 < 0.28 ? 0.45 : 0;
      bytes.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 750 * t) * voiced * 32767), i * 2);
    }
    chunks.push(bytes.toString('base64'));
  }
  return chunks;
}

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
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/status', (route) => route.fulfill({ json: { ai: true } }));
  let ticket;
  await page.route('**/api/live', (route) => {
    ticket = route.request().postDataJSON();
    return route.fulfill({
      json: { token: 'auth_tokens/test', model: 'gemini-3.8-live', config: { tools: [] } },
    });
  });
  const sent = { setup: null, mic: 0, tools: [] };
  await page.routeWebSocket(/BidiGenerateContentConstrained/, (ws) => {
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.realtimeInput?.audio) sent.mic++;
      if (message.toolResponse) sent.tools.push(message.toolResponse);
      if (!message.setup) return;
      sent.setup = message.setup;
      ws.send(JSON.stringify({ setupComplete: {} }));
      const audio = speech(2.4);
      setTimeout(() => {
        ws.send(
          JSON.stringify({ serverContent: { outputTranscription: { text: 'أهلًا يا شباب، ' } } }),
        );
        ws.send(
          JSON.stringify({
            toolCall: { functionCalls: [{ id: 'c1', name: 'go_to', args: { place: 'board' } }] },
          }),
        );
        audio.forEach((data, i) =>
          setTimeout(
            () =>
              ws.send(
                JSON.stringify({
                  serverContent: {
                    modelTurn: {
                      parts: [{ inlineData: { data, mimeType: 'audio/pcm;rate=24000' } }],
                    },
                  },
                }),
              ),
            i * 60,
          ),
        );
        ws.send(
          JSON.stringify({ serverContent: { outputTranscription: { text: 'تعالوا للسبورة.' } } }),
        );
        setTimeout(() => ws.send(JSON.stringify({ serverContent: { turnComplete: true } })), 900);
      }, 400);
    });
  });

  await page.goto(`${url}/#/room/classroom-stage`);
  await page
    .getByRole('button', { name: /مكالمة صوت/ })
    .first()
    .click();
  await page.getByText('على الخط').waitFor();
  assert.equal(ticket.characterId, 'ms-nour');
  assert.match(ticket.world, /omar \(عمر\) sitting at ديسك عمر/);
  assert.deepEqual(sent.setup, { model: 'models/gemini-3.8-live', tools: [] });

  // While the audio plays: she has the floor, her lips follow the sound, she walks to the board.
  const teacher = page.locator('[data-character="ms-nour"]');
  const lips = new Set();
  let speaking = false;
  let listening = false;
  for (let i = 0; i < 40; i++) {
    lips.add(await teacher.getAttribute('data-lips'));
    const mode = await teacher.getAttribute('data-mode');
    speaking ||= mode === 'speaking';
    listening ||=
      mode === 'speaking' &&
      (await page.locator('[data-character="karim"]').getAttribute('data-mode')) === 'listening';
    await page.waitForTimeout(60);
  }
  assert.ok(speaking, 'the speaker holds the floor while audio plays');
  assert.ok(listening, 'the others listen while she speaks');
  assert.ok(lips.has('AA'), `open vowel lips seen: ${[...lips]}`);
  assert.ok(lips.has('REST') || lips.has(''), 'lips close in the gaps');
  await page.waitForFunction(
    () => document.querySelector('[data-character="ms-nour"]')?.getAttribute('data-at') === 'board',
  );
  await page.screenshot({ path: 'test-results/voice.png', fullPage: true });
  await page.getByText('أهلًا يا شباب، تعالوا للسبورة.').waitFor();
  assert.deepEqual(sent.tools[0], {
    functionResponses: [{ id: 'c1', name: 'go_to', response: { ok: true }, scheduling: 'SILENT' }],
  });
  assert.ok(sent.mic > 0, 'the microphone streams audio');

  // After the audio drains the floor is free; hanging up ends the call.
  await page.waitForFunction(
    () =>
      document.querySelector('[data-character="ms-nour"]')?.getAttribute('data-mode') !==
      'speaking',
  );
  await page.getByRole('button', { name: 'إنهاء' }).click();
  await page
    .getByRole('button', { name: /مكالمة صوت/ })
    .first()
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Voice flow passed: live audio, lip sync from playback, silent stage tool, mic, transcript.',
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
