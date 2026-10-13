import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ValleyModel } from './model';

const prefersLessMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Rainbow Valley as a room surface: the conversation writes the model, Phaser draws it. */
export class ValleySurface implements RoomSurface {
  readonly model: ValleyModel;
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    private spec: RoomSpec,
    store?: RoomStore,
    options: { reducedMotion?: boolean } = {},
  ) {
    const model = new ValleyModel({
      reducedMotion: options.reducedMotion ?? prefersLessMotion(),
      memory: () => store?.get(),
    });
    this.model = model;
    this.View = function ValleyView(props: SurfaceViewProps) {
      return <Valley model={model} frame={props.frame} />;
    };
  }

  /** Plays a scene; never waits more than 20 s, even if the world could not be drawn. */
  play(scene: string) {
    return Promise.race([
      this.model.play(scene),
      new Promise<void>((done) => setTimeout(done, 20_000)),
    ]);
  }

  act(character: string, action: string, args: Record<string, unknown>) {
    this.model.act(character, action, args);
  }
  speak(character: string | null) {
    this.model.speak(character);
  }
  get speaking() {
    return this.model.speaker;
  }
  setMode(character: string, mode: PresenceMode) {
    this.model.setMode(character, mode);
  }
  mouth(character: string, frame: MouthFrame | null) {
    this.model.mouth(character, frame);
  }
  state() {
    return this.model.state(this.spec.characters);
  }
}

/** Loads Phaser only when the valley is on screen, and frees it when it leaves. */
function Valley({ model, frame }: { model: ValleyModel; frame: SurfaceViewProps['frame'] }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'waking' | 'ready' | 'failed'>('waking');
  useEffect(() => {
    let stop: (() => void) | undefined;
    let gone = false;
    import('./scene')
      .then(({ startValley }) => {
        if (gone || !host.current) return;
        stop = startValley(host.current, model).stop;
        setStatus('ready');
      })
      .catch(() => !gone && setStatus('failed'));
    return () => {
      gone = true;
      stop?.();
    };
  }, [model]);
  return (
    <div
      role="img"
      aria-label="وادي قوس قزح: اليونيكورن الطايرة وجدّة القمر"
      data-world="rainbow-valley"
      data-status={status}
      style={{
        position: 'relative',
        width: '100%',
        ...(frame === 'screen' ? { height: '100%' } : { aspectRatio: '16 / 9', borderRadius: 18 }),
        overflow: 'hidden',
        background: '#4a3a8c',
      }}
    >
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      {status !== 'ready' && (
        <p
          style={{
            position: 'absolute',
            inset: 0,
            margin: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#fdf4ff',
          }}
        >
          {status === 'failed' ? 'الوادي مش راضي يفتح دلوقتي.' : 'الوادي بيصحى… ✨'}
        </p>
      )}
    </div>
  );
}
