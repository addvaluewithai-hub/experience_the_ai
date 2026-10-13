import type { MouthFrame } from '@experience/room-spec';
import { analyzePcm } from './visemes';

type Sample = { at: number; end: number; frame: MouthFrame };

/**
 * Plays streamed PCM and samples mouth frames on the same AudioContext clock (pixilive's
 * single-clock rule): a mouth moves for what is audible now, not for when packets arrived.
 * Interruption stops sound and mouth together.
 */
export class PlaybackClock {
  private context: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private segments: { start: number; end: number }[] = [];
  private frames: Sample[] = [];
  private end = 0;

  get now() {
    return this.context?.currentTime ?? 0;
  }

  /** Must run inside a user gesture: browsers only start audio after one. */
  async unlock() {
    this.context ??= new AudioContext({ latencyHint: 'interactive' });
    await this.context.resume();
  }

  enqueue(base64: string, rate = 24000) {
    const context = this.context;
    if (!context || context.state !== 'running') throw new Error('Audio is not running.');
    const raw = atob(base64);
    if (raw.length % 2 || rate < 8000 || rate > 96000) throw new Error('Invalid PCM audio.');
    const samples = new Int16Array(raw.length / 2);
    for (let i = 0; i < samples.length; i++) {
      const value = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
      samples[i] = value >= 0x8000 ? value - 0x10000 : value;
    }
    if (!samples.length) return;
    const buffer = context.createBuffer(1, samples.length, rate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 32768;
    const start = Math.max(context.currentTime + 0.075, this.end);
    const end = start + buffer.duration;
    const analyzed = analyzePcm(samples, rate);
    analyzed.forEach(({ offset, frame }, i) =>
      this.frames.push({
        at: start + offset,
        end: Math.min(end, start + (analyzed[i + 1]?.offset ?? buffer.duration)),
        frame,
      }),
    );
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    this.segments.push({ start, end });
    this.end = end;
    source.start(start);
  }

  /** What is audible right now. */
  sample() {
    const now = this.now;
    while (this.frames.length && this.frames[0].end <= now) this.frames.shift();
    while (this.segments.length && this.segments[0].end <= now) this.segments.shift();
    const first = this.frames[0];
    return {
      mouth: first && first.at <= now ? first.frame : null,
      speaking: this.segments.some((s) => s.start <= now && now < s.end),
      drained: this.segments.length === 0,
    };
  }

  interrupt() {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Already ended.
      }
    }
    this.sources.clear();
    this.frames = [];
    this.segments = [];
    this.end = 0;
  }

  async close() {
    this.interrupt();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') await context.close();
  }
}
