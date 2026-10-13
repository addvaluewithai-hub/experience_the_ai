import type { Presence } from '@experience/room-spec';
import { PlaybackClock } from './clock';
import { LiveConnection, type LiveTicket, type ToolCall, type ToolReply } from './live';
import { Microphone } from './microphone';

export type VoiceStatus = 'connecting' | 'live' | 'ended' | 'error';

/** What a voice call needs from the app; the session knows nothing about rooms or drawing. */
export type VoiceHost = {
  character: string;
  ticket(): Promise<LiveTicket>;
  /** Runs one tool call through the room's rules; `silent` for presentation-only tools. */
  runTool(call: ToolCall): { response: Record<string, unknown>; silent: boolean };
  /** A transcript line so far; `final` when that turn is over. */
  transcript(role: 'person' | 'character', text: string, final: boolean): void;
  status(status: VoiceStatus, message?: string): void;
  presence?: Presence;
  /** Sent once the line is open so the character speaks first (e.g. the person just arrived). */
  greet?: string;
  /** For tests: the socket address and the microphone worklet. */
  url?: string;
  worklet?: string;
};

/**
 * A live voice call with one character. Audio plays on one clock; each animation frame sends
 * the audible mouth to the presence, which gives this character the floor while it speaks.
 */
export class VoiceSession {
  private clock = new PlaybackClock();
  private mic = new Microphone();
  private live: LiveConnection;
  private raf = 0;
  private lines = { person: '', character: '' };
  private ended = false;
  private talking = false;

  constructor(private host: VoiceHost) {
    this.live = new LiveConnection({
      audio: (data, rate) => {
        try {
          this.clock.enqueue(data, rate);
        } catch (error) {
          this.fail(error instanceof Error ? error.message : 'Audio failed.');
        }
      },
      transcript: (role, text) => {
        if (role === 'person' && this.lines.character) this.finish('character');
        this.lines[role] += text;
        host.transcript(role, this.lines[role].trim(), false);
      },
      interrupted: () => {
        this.clock.interrupt();
        this.finish('character');
      },
      turnComplete: () => {
        this.finish('person');
        this.finish('character');
      },
      toolCalls: (calls) =>
        this.live.respond(
          calls.map((call): ToolReply => ({ ...call, ...this.host.runTool(call) })),
        ),
      cancelled: () => {},
      closed: (reason) => this.fail(reason),
    });
  }

  /** Call from a click or tap: audio can only start inside a user gesture. */
  async start() {
    this.host.status('connecting');
    try {
      await this.clock.unlock();
      const ticket = await this.host.ticket();
      if (this.ended) return;
      await this.live.connect(ticket, this.host.url);
      await this.mic.start((pcm) => this.live.audio(pcm), this.host.worklet);
      if (this.ended) return;
      this.host.status('live');
      if (this.host.greet) this.live.text(this.host.greet);
      this.loop();
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'The voice call could not start.');
    }
  }

  mute(muted: boolean) {
    this.mic.muted = muted;
  }

  /** Words typed during the call, for when the person cannot speak aloud; the character answers. */
  say(text: string) {
    this.live.text(text);
  }

  /** Context the character should know without answering, e.g. where everyone stands now. */
  note(text: string) {
    this.live.text(text, false);
  }

  async stop(status: VoiceStatus = 'ended', message?: string) {
    if (this.ended) return;
    this.ended = true;
    cancelAnimationFrame(this.raf);
    this.live.close();
    this.finish('person');
    this.finish('character');
    this.release();
    await Promise.all([this.mic.stop(), this.clock.close()]);
    this.host.status(status, message);
  }

  private loop = () => {
    const { mouth, speaking } = this.clock.sample();
    const presence = this.host.presence;
    if (presence) {
      presence.mouth(this.host.character, mouth);
      if (speaking && !this.talking) presence.speak(this.host.character);
      if (!speaking && this.talking) this.release();
    }
    this.talking = speaking;
    this.raf = requestAnimationFrame(this.loop);
  };

  private release() {
    const presence = this.host.presence;
    presence?.mouth(this.host.character, null);
    if (presence?.speaking === this.host.character) presence.speak(null);
    this.talking = false;
  }

  private finish(role: 'person' | 'character') {
    if (!this.lines[role].trim()) return;
    this.host.transcript(role, this.lines[role].trim(), true);
    this.lines[role] = '';
  }

  private fail(message: string) {
    void this.stop('error', message);
  }
}
