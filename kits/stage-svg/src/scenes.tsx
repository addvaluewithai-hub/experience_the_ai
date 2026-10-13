import { type Scene } from './world/kit';
import { memo } from 'react';
import { shade, tint } from './color';
import { VIEW } from './project';

const { width: W, height: H, horizon: Y } = VIEW;

/** Back wall or sky above the horizon, floor below it, in the scene's own palette. */
export const Backdrop = memo(function Backdrop({
  scene,
  accent,
}: {
  scene: Scene;
  accent: string;
}) {
  const floor = (fill: string, lines?: string) => (
    <g>
      <rect x={0} y={Y} width={W} height={H - Y} fill={fill} />
      {lines
        ? Array.from({ length: 9 }, (_, i) => {
            const x = (i / 8) * W;
            return (
              <path
                key={i}
                d={`M${W / 2 + (x - W / 2) * 0.66} ${Y} L${W / 2 + (x - W / 2) * 1.2} ${H}`}
                stroke={lines}
                strokeWidth={1.5}
                opacity={0.35}
              />
            );
          })
        : null}
    </g>
  );
  switch (scene) {
    case 'classroom':
      return (
        <g>
          <rect width={W} height={Y} fill="#f3ead9" />
          <rect y={Y - 18} width={W} height={18} fill="#d8c8a8" />
          {floor('#c99d6b', '#8f6a43')}
        </g>
      );
    case 'space':
      return (
        <g>
          <defs>
            <linearGradient id="space-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1030" />
              <stop offset="1" stopColor="#2a2060" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#space-sky)" />
          {Array.from({ length: 60 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 337) % W}
              cy={(i * 191) % (Y - 20)}
              r={i % 7 === 0 ? 2.2 : 1.2}
              fill="#fff"
              opacity={0.4 + (i % 5) * 0.12}
            />
          ))}
          <ellipse cx={W / 2} cy={H + 260} rx={W * 0.9} ry={560} fill="#5b5778" />
          <ellipse
            cx={W / 2}
            cy={H + 260}
            rx={W * 0.9}
            ry={560}
            fill="none"
            stroke={accent}
            strokeOpacity={0.4}
            strokeWidth={3}
          />
        </g>
      );
    case 'home':
      return (
        <g>
          <rect width={W} height={Y} fill={tint(accent, 0.82)} />
          <rect y={Y - 14} width={W} height={14} fill="#fffaf2" />
          {floor('#d7a978', '#a8784a')}
        </g>
      );
    case 'garden':
      return (
        <g>
          <rect width={W} height={Y} fill="#bfe6ff" />
          <circle cx={W * 0.82} cy={80} r={36} fill="#ffe27a" />
          <path
            d={`M0 ${Y} Q${W * 0.25} ${Y - 70} ${W * 0.5} ${Y - 10} Q${W * 0.75} ${Y - 80} ${W} ${Y}Z`}
            fill="#8fd18a"
          />
          {floor('#79c06e')}
        </g>
      );
    case 'stage':
      return (
        <g>
          <rect width={W} height={Y} fill="#2a1830" />
          <path
            d={`M0 0 H140 Q110 ${Y * 0.6} 150 ${Y} H0Z M${W} 0 H${W - 140} Q${W - 110} ${Y * 0.6} ${W - 150} ${Y} H${W}Z`}
            fill="#b3263a"
          />
          {floor('#9a6b44', '#6e4a2c')}
        </g>
      );
    default:
      return (
        <g>
          <rect width={W} height={Y} fill={tint(accent, 0.88)} />
          {floor(tint(accent, 0.7))}
          <path d={`M0 ${Y} H${W}`} stroke={shade(accent, 0.1)} strokeOpacity={0.3} />
        </g>
      );
  }
});
