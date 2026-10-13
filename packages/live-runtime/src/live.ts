/** What the server hands out: a single-use token and the setup it locked (new-learn's Nova
 * pattern), sent back unchanged when the socket opens. */
export type LiveTicket = { token: string; model: string; config: Record<string, unknown> };
export type ToolCall = { id?: string; name: string; args: Record<string, unknown> };
export type ToolReply = {
  id?: string;
  name: string;
  response: Record<string, unknown>;
  silent?: boolean;
};

export type LiveEvents = {
  audio(data: string, rate: number): void;
  transcript(role: 'person' | 'character', text: string): void;
  interrupted(): void;
  turnComplete(): void;
  toolCalls(calls: ToolCall[]): void;
  cancelled(ids: string[]): void;
  closed(reason: string): void;
};

const URL_BASE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';

/** One Gemini Live socket: audio and text in, audio, transcripts and tool calls out. */
export class LiveConnection {
  private socket: WebSocket | null = null;
  private ready = false;
  private closing = false;

  constructor(private events: LiveEvents) {}

  connect(ticket: LiveTicket, url = URL_BASE) {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(`${url}?access_token=${encodeURIComponent(ticket.token)}`);
      this.socket = socket;
      let settled = false;
      const timer = setTimeout(() => fail('The voice connection took too long.'), 15000);
      const fail = (message: string) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(message));
        } else if (!this.closing) this.events.closed(message);
        this.close();
      };
      socket.onopen = () =>
        this.send({ setup: { model: `models/${ticket.model}`, ...ticket.config } });
      socket.onerror = () => fail('Could not connect the voice call.');
      socket.onclose = () => {
        this.ready = false;
        if (!this.closing) fail('The voice call ended.');
      };
      socket.onmessage = async (event) => {
        let message;
        try {
          message = JSON.parse(
            typeof event.data === 'string' ? event.data : await (event.data as Blob).text(),
          );
        } catch {
          return fail('Could not read the voice reply.');
        }
        if (message.setupComplete && !settled) {
          settled = true;
          this.ready = true;
          clearTimeout(timer);
          resolve();
        }
        if (message.error) return fail('The voice service refused the session.');
        const content = message.serverContent;
        if (content?.interrupted) this.events.interrupted();
        if (content?.inputTranscription?.text)
          this.events.transcript('person', content.inputTranscription.text);
        if (content?.outputTranscription?.text)
          this.events.transcript('character', content.outputTranscription.text);
        for (const part of content?.modelTurn?.parts ?? [])
          if (part.inlineData?.data && String(part.inlineData.mimeType).startsWith('audio/pcm'))
            this.events.audio(
              part.inlineData.data,
              Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000),
            );
        const calls = message.toolCall?.functionCalls;
        if (Array.isArray(calls) && calls.length)
          this.events.toolCalls(
            calls.map((c: ToolCall) => ({ id: c.id, name: String(c.name), args: c.args ?? {} })),
          );
        if (message.toolCallCancellation?.ids)
          this.events.cancelled(message.toolCallCancellation.ids);
        if (content?.turnComplete) this.events.turnComplete();
        if (message.goAway) fail('The voice call reached its time limit.');
      };
    });
  }

  private send(value: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(value));
  }
  get open() {
    return this.ready;
  }
  audio(pcm16k: string) {
    if (this.ready)
      this.send({ realtimeInput: { audio: { data: pcm16k, mimeType: 'audio/pcm;rate=16000' } } });
  }
  /** A typed turn, or (complete false) silent context the model should not answer by itself. */
  text(text: string, complete = true) {
    if (this.ready)
      this.send({
        clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: complete },
      });
  }
  /** All replies to one batch together; SILENT sits beside the response, not inside it. */
  respond(replies: ToolReply[]) {
    this.send({
      toolResponse: {
        functionResponses: replies.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          name: r.name,
          response: r.response,
          ...(r.silent ? { scheduling: 'SILENT' } : {}),
        })),
      },
    });
  }
  close() {
    if (this.closing) return;
    this.closing = true;
    this.ready = false;
    this.socket?.close();
    this.socket = null;
  }
}
