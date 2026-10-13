import { useEffect, useRef, useState } from 'react';
import type { SurfaceViewProps } from '@experience/room-runtime';

/** Starts a drawn world inside the element it is given; returns how to stop it. */
export type Starter = (parent: HTMLElement) => () => void;

/**
 * A Phaser world on screen: loaded only when shown (so no other room pays for Phaser) and
 * freed when it leaves. `load` must stay the same function for the life of the surface.
 */
export function PhaserFrame(props: {
  world: string;
  label: string;
  background: string;
  frame: SurfaceViewProps['frame'];
  load: () => Promise<Starter>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'waking' | 'ready' | 'failed'>('waking');
  const { load } = props;
  useEffect(() => {
    let stop: (() => void) | undefined;
    let gone = false;
    load()
      .then((start) => {
        if (gone || !host.current) return;
        stop = start(host.current);
        setStatus('ready');
      })
      .catch(() => !gone && setStatus('failed'));
    return () => {
      gone = true;
      stop?.();
    };
  }, [load]);
  return (
    <div
      role="img"
      aria-label={props.label}
      data-world={props.world}
      data-status={status}
      style={{
        position: 'relative',
        width: '100%',
        ...(props.frame === 'screen'
          ? { height: '100%' }
          : { aspectRatio: '16 / 9', borderRadius: 18 }),
        overflow: 'hidden',
        background: props.background,
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
          {status === 'failed' ? 'المكان ده مش راضي يفتح دلوقتي.' : 'بيصحى… ✨'}
        </p>
      )}
    </div>
  );
}
