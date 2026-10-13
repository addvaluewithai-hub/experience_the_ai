/** Resamples float audio to 16 kHz little-endian PCM, keeping the fractional position across
 * chunks (from pixilive feat/character-engine). */
export class PcmResampler {
  private pending: number[] = [];
  private position = 0;

  convert(input: Float32Array, sourceRate: number): string {
    for (const value of input) this.pending.push(value);
    const ratio = sourceRate / 16000;
    const output: number[] = [];
    while (this.position + ratio <= this.pending.length) {
      const end = this.position + ratio;
      let sum = 0;
      for (let i = Math.floor(this.position); i < Math.ceil(end); i++)
        sum += this.pending[i] * (Math.min(end, i + 1) - Math.max(this.position, i));
      output.push(sum / ratio);
      this.position = end;
    }
    const consumed = Math.floor(this.position);
    this.pending.splice(0, consumed);
    this.position -= consumed;
    let binary = '';
    for (const value of output) {
      const s = Math.max(-1, Math.min(1, value));
      const int = Math.round(s * (s < 0 ? 32768 : 32767)) & 0xffff;
      binary += String.fromCharCode(int & 0xff, int >> 8);
    }
    return btoa(binary);
  }
}

/** Microphone capture through an AudioWorklet served at `worklet` (see apps/platform/public). */
export class Microphone {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private generation = 0;
  muted = false;

  async start(onAudio: (pcm16k: string) => void, worklet = '/audio-capture.worklet.js') {
    const generation = ++this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    if (generation !== this.generation) return stream.getTracks().forEach((t) => t.stop());
    this.stream = stream;
    const context = new AudioContext({ latencyHint: 'interactive' });
    this.context = context;
    try {
      await context.resume();
      await context.audioWorklet.addModule(worklet);
      if (generation !== this.generation) return;
      const source = context.createMediaStreamSource(stream);
      const capture = new AudioWorkletNode(context, 'experience-audio-capture');
      const resampler = new PcmResampler();
      capture.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (generation !== this.generation || this.muted) return;
        const data = resampler.convert(event.data, context.sampleRate);
        if (data) onAudio(data);
      };
      source.connect(capture);
      // A worklet only runs while pulled by the graph; it outputs silence.
      capture.connect(context.destination);
    } catch (error) {
      if (generation === this.generation) await this.stop();
      throw error;
    }
  }

  async stop() {
    ++this.generation;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') await context.close();
  }
}
