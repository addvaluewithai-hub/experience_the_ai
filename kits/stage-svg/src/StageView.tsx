import { useEffect, useState, type ReactNode } from 'react';
import { type RoomData, type RoomSpec } from '@experience/room-spec';
import { propStateOf } from './world/stage';
import type { StageController } from './controller';
import { Humanoid } from './humanoid/Humanoid';
import { project, VIEW } from './project';
import { PropShape } from './props';
import { Backdrop } from './scenes';

type Props = { spec: RoomSpec; controller: StageController; data: RoomData; title: string };

/**
 * Draws one stage: backdrop, props in their data-bound states and every cast member from its
 * rig, painted back to front. It only reads the controller; commands arrive elsewhere.
 */
export function StageView({ spec, controller, data, title }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      controller.step((now - last) / 1000);
      last = now;
      setTick((t) => (t + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [controller]);

  const { stage } = controller;
  const accent = spec.theme.accent;
  const frames = controller.frames();
  const items: { z: number; node: ReactNode }[] = [];
  for (const prop of stage.props) {
    const place = stage.places.find((p) => p.id === prop.at)!;
    const at = project({ x: place.x, depth: place.depth, height: place.height });
    const state = propStateOf(prop, data);
    items.push({
      z: at.z,
      node: (
        <g
          key={`prop-${prop.id}`}
          data-prop={prop.id}
          data-state={state ?? ''}
          transform={`translate(${at.sx.toFixed(1)} ${at.sy.toFixed(1)}) scale(${at.scale.toFixed(3)})`}
        >
          <PropShape prop={prop.prop} state={state} accent={accent} />
        </g>
      ),
    });
  }
  const names: string[] = [];
  for (const [id, frame] of frames) {
    const character = spec.characters.find((c) => c.id === id);
    const look = controller.stage.cast.find((c) => c.character === id)?.look;
    if (!character || !look) continue;
    const at = project(frame);
    const ground = project({ ...frame, height: 0 });
    const flip = Math.sign(frame.facing || 1) * Math.max(0.2, Math.abs(frame.facing));
    const place = stage.places.find((p) => p.id === frame.at);
    names.push(`${character.name}${place ? `: ${place.label}` : ''}`);
    items.push({
      z: at.z + 0.5,
      node: (
        <g
          key={`cast-${id}`}
          data-character={id}
          data-at={frame.at ?? ''}
          data-pose={frame.sit > 0.5 ? 'sit' : 'stand'}
          data-mode={frame.mode}
          data-lips={frame.lips ?? ''}
        >
          <ellipse
            cx={ground.sx}
            cy={ground.sy}
            rx={26 * ground.scale * (1 - frame.height * 0.6)}
            ry={7 * ground.scale}
            fill="#000"
            opacity={0.16 - frame.height * 0.08}
          />
          {frame.mode === 'speaking' ? (
            <ellipse
              cx={ground.sx}
              cy={ground.sy}
              rx={34 * ground.scale}
              ry={10 * ground.scale}
              fill="none"
              stroke={accent}
              strokeWidth={3}
              opacity={0.7}
            />
          ) : null}
          <g
            transform={`translate(${at.sx.toFixed(1)} ${(at.sy - frame.bob * at.scale).toFixed(1)}) scale(${(at.scale * flip).toFixed(3)} ${at.scale.toFixed(3)})`}
          >
            <Humanoid look={look} frame={frame} />
          </g>
        </g>
      ),
    });
  }
  items.sort((a, b) => a.z - b.z);
  return (
    <div className="stage-view">
      <svg
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        role="img"
        aria-label={`${title}: ${names.join('، ')}`}
      >
        <Backdrop scene={stage.scene} accent={accent} />
        {items.map((item) => item.node)}
      </svg>
    </div>
  );
}
