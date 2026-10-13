import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeFrame, analyzePcm, LiveConnection, PcmResampler } from '../src/index.ts';

const RATE = 24000;
function tone(seconds: number, frequency: number, amplitude: number) {
  return Int16Array.from({ length: seconds * RATE }, (_, i) =>
    Math.round(Math.sin((2 * Math.PI * frequency * i) / RATE) * amplitude * 32767),
  );
}
function noise(seconds: number, amplitude: number) {
  let seed = 7;
  return Int16Array.from({ length: seconds * RATE }, () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return Math.round(((seed / 0x7fffffff) * 2 - 1) * amplitude * 32767);
  });
}

test('silence closes the mouth; an open vowel opens it; hiss is a consonant', () => {
  assert.deepEqual(analyzeFrame(new Int16Array(576), RATE), {
    viseme: 'REST',
    open: 0.03,
    energy: 0,
  });
  const vowel = analyzeFrame(tone(0.024, 750, 0.5), RATE);
  assert.equal(vowel.viseme, 'AA');
  assert.ok(vowel.open > 0.5 && vowel.energy > 0.5);
  const hiss = analyzeFrame(noise(0.024, 0.08), RATE);
  assert.ok(['S', 'FV'].includes(hiss.viseme), hiss.viseme);
});

test('a second of audio gives a mouth frame every 20 ms', () => {
  const frames = analyzePcm(tone(1, 750, 0.4), RATE);
  assert.equal(frames.length, 50);
  assert.equal(frames[1].offset, 0.02);
});

test('the microphone is resampled to 16 kHz little-endian PCM across chunks', () => {
  const resampler = new PcmResampler();
  const chunk = new Float32Array(480).fill(0.5);
  const bytes = atob(resampler.convert(chunk, 48000));
  assert.equal(bytes.length, 320);
  const first = bytes.charCodeAt(0) | (bytes.charCodeAt(1) << 8);
  assert.equal(first, Math.round(0.5 * 32767));
  assert.equal(atob(resampler.convert(new Float32Array(300), 48000)).length, 200);
});

class FakeSocket {
  static last: FakeSocket;
  static OPEN = 1;
  readyState = 1;
  sent: any[] = [];
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  constructor(public url: string) {
    FakeSocket.last = this;
    queueMicrotask(() => this.onopen?.());
  }
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
  server(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

test('the live protocol: locked setup, audio, transcripts, tools and silent replies', async () => {
  (globalThis as any).WebSocket = FakeSocket;
  const seen: string[] = [];
  const connection = new LiveConnection({
    audio: (data, rate) => seen.push(`audio ${data} ${rate}`),
    transcript: (role, text) => seen.push(`${role}: ${text}`),
    interrupted: () => seen.push('interrupted'),
    turnComplete: () => seen.push('done'),
    toolCalls: (calls) => seen.push(`tools ${calls.map((c) => c.name).join(',')}`),
    cancelled: () => {},
    closed: (reason) => seen.push(`closed ${reason}`),
  });
  const ready = connection.connect(
    { token: 't/1', model: 'gemini-3.8-live', config: { tools: [] } },
    'wss://x',
  );
  await new Promise((r) => setTimeout(r, 0));
  const socket = FakeSocket.last;
  assert.equal(socket.url, 'wss://x?access_token=t%2F1');
  assert.deepEqual(socket.sent[0], { setup: { model: 'models/gemini-3.8-live', tools: [] } });
  socket.server({ setupComplete: {} });
  await ready;
  socket.server({
    serverContent: {
      outputTranscription: { text: 'أهلًا' },
      modelTurn: { parts: [{ inlineData: { data: 'AAA=', mimeType: 'audio/pcm;rate=24000' } }] },
    },
    toolCall: { functionCalls: [{ id: 'c1', name: 'go_to', args: { place: 'board' } }] },
  });
  socket.server({ serverContent: { interrupted: true, turnComplete: true } });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(seen, [
    'character: أهلًا',
    'audio AAA= 24000',
    'tools go_to',
    'interrupted',
    'done',
  ]);
  connection.respond([{ id: 'c1', name: 'go_to', response: { ok: true }, silent: true }]);
  assert.deepEqual(socket.sent.at(-1), {
    toolResponse: {
      functionResponses: [
        { id: 'c1', name: 'go_to', response: { ok: true }, scheduling: 'SILENT' },
      ],
    },
  });
  connection.audio('QUJD');
  assert.deepEqual(socket.sent.at(-1), {
    realtimeInput: { audio: { data: 'QUJD', mimeType: 'audio/pcm;rate=16000' } },
  });
  connection.close();
});
