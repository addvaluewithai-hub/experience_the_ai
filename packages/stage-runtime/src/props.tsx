import type { PropKind } from '@experience/room-spec';
import { shade, tint } from './color';

/**
 * The prop kit, drawn in stage units with the base at the origin (an adult is about 190 tall;
 * a desk top is at 72, a chair seat at 42, matching the controller's seat heights).
 */
export function PropShape({
  prop,
  state,
  accent,
}: {
  prop: PropKind;
  state?: string;
  accent: string;
}) {
  const wood = '#b07a4f';
  switch (prop) {
    case 'desk':
      return (
        <g>
          <rect
            x={-58}
            y={-72}
            width={116}
            height={12}
            rx={3}
            fill={wood}
            stroke={shade(wood, 0.3)}
          />
          <rect x={-52} y={-60} width={8} height={60} fill={shade(wood, 0.25)} />
          <rect x={44} y={-60} width={8} height={60} fill={shade(wood, 0.25)} />
          <rect x={-48} y={-60} width={96} height={26} fill={shade(wood, 0.12)} opacity={0.8} />
        </g>
      );
    case 'chair':
      return (
        <g fill={shade(accent, 0.15)}>
          <rect x={-24} y={-96} width={48} height={50} rx={6} />
          <rect x={-26} y={-46} width={52} height={8} rx={3} fill={shade(accent, 0.3)} />
          <rect x={-22} y={-38} width={5} height={38} fill="#555" />
          <rect x={17} y={-38} width={5} height={38} fill="#555" />
        </g>
      );
    case 'rug':
      return (
        <ellipse
          cx={0}
          cy={-3}
          rx={95}
          ry={20}
          fill={tint(accent, 0.45)}
          stroke={accent}
          strokeWidth={3}
        />
      );
    case 'sofa':
      return (
        <g fill={shade(accent, 0.1)}>
          <rect x={-90} y={-82} width={180} height={44} rx={16} />
          <rect x={-95} y={-48} width={190} height={34} rx={10} fill={accent} />
          <rect x={-100} y={-62} width={22} height={52} rx={9} />
          <rect x={78} y={-62} width={22} height={52} rx={9} />
        </g>
      );
    case 'bed':
      return (
        <g>
          <rect x={-95} y={-52} width={190} height={40} rx={8} fill="#f4efe6" stroke="#cfc6b6" />
          <rect x={-95} y={-44} width={120} height={32} rx={6} fill={tint(accent, 0.3)} />
          <rect x={60} y={-62} width={34} height={20} rx={8} fill="#fff" stroke="#ddd" />
          <rect x={-100} y={-12} width={200} height={12} rx={3} fill={wood} />
        </g>
      );
    case 'board':
      return (
        <g>
          <rect
            x={-120}
            y={-210}
            width={240}
            height={130}
            rx={6}
            fill="#2f5d50"
            stroke="#8a6a4a"
            strokeWidth={8}
          />
          {state === 'written' ? (
            <path
              d="M-95 -180 h120 M-95 -158 h160 M-95 -136 h90"
              stroke="#f2f2e9"
              strokeWidth={4}
              strokeLinecap="round"
            />
          ) : null}
          <rect x={-6} y={-80} width={12} height={80} fill="#8a6a4a" />
        </g>
      );
    case 'bowl':
      return (
        <g>
          <path d="M-18 -14 Q0 4 18 -14Z" fill={accent} stroke={shade(accent, 0.3)} />
          {state === 'full' ? <ellipse cx={0} cy={-15} rx={15} ry={5} fill="#c8843f" /> : null}
        </g>
      );
    case 'water':
      return (
        <g>
          <path d="M-18 -12 Q0 4 18 -12Z" fill="#9fb8c8" stroke="#5f7d90" />
          {state === 'full' ? <ellipse cx={0} cy={-13} rx={15} ry={4} fill="#4fb3ff" /> : null}
        </g>
      );
    case 'plant': {
      const grown = state === 'grown';
      return (
        <g>
          <path d="M-14 0 L-11 -24 L11 -24 L14 0Z" fill="#c26a3d" />
          {[-1, 0, 1].map((i) => (
            <ellipse
              key={i}
              cx={i * (grown ? 14 : 7)}
              cy={grown ? -52 : -34}
              rx={grown ? 12 : 7}
              ry={grown ? 22 : 11}
              fill="#3fa35f"
              transform={`rotate(${i * 25} ${i * 6} -24)`}
            />
          ))}
        </g>
      );
    }
    case 'tree':
      return (
        <g>
          <rect x={-9} y={-110} width={18} height={110} fill="#7a5233" />
          {state !== 'bare' ? (
            <circle cx={0} cy={-140} r={58} fill="#3f9b57" />
          ) : (
            <path d="M0 -100 L-30 -150 M0 -110 L28 -160" stroke="#7a5233" strokeWidth={6} />
          )}
          {state === 'blooming'
            ? [
                [-25, -150],
                [20, -165],
                [10, -120],
                [-35, -125],
                [32, -135],
              ].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={6} fill="#ff8fb1" />)
            : null}
        </g>
      );
    case 'rocket': {
      const flying = state === 'flying';
      return (
        <g transform={flying ? 'translate(0 -60)' : undefined}>
          {flying ? <path d="M-14 -10 Q0 50 14 -10Z" fill="#ffb347" /> : null}
          <path
            d="M-22 -10 L-22 -110 Q0 -165 22 -110 L22 -10Z"
            fill="#eef1f6"
            stroke="#8892a6"
            strokeWidth={2}
          />
          <circle cx={0} cy={-95} r={10} fill="#7fd1ff" stroke="#8892a6" strokeWidth={2} />
          <path d="M-22 -40 L-38 -5 L-22 -14Z M22 -40 L38 -5 L22 -14Z" fill={accent} />
        </g>
      );
    }
    case 'planet': {
      const lit = state === 'lit';
      return (
        <g>
          {lit ? <circle cx={0} cy={-60} r={74} fill={accent} opacity={0.25} /> : null}
          <circle
            cx={0}
            cy={-60}
            r={58}
            fill={lit ? accent : '#4a4f63'}
            stroke={shade(lit ? accent : '#4a4f63', 0.3)}
            strokeWidth={2}
          />
          <circle cx={-18} cy={-72} r={11} fill="#000" opacity={0.12} />
          <circle cx={20} cy={-45} r={7} fill="#000" opacity={0.12} />
        </g>
      );
    }
    case 'star':
      return (
        <path
          d="M0 -40 L9 -18 L32 -16 L14 -2 L20 22 L0 9 L-20 22 L-14 -2 L-32 -16 L-9 -18Z"
          transform="translate(0 -20)"
          fill={state === 'bright' ? '#ffd65a' : '#8a8aa0'}
          opacity={state === 'bright' ? 1 : 0.6}
        />
      );
    case 'door':
      return (
        <g>
          <rect
            x={-38}
            y={-150}
            width={76}
            height={150}
            fill={state === 'open' ? '#2a2230' : wood}
            stroke={shade(wood, 0.35)}
            strokeWidth={4}
          />
          {state !== 'open' ? <circle cx={24} cy={-75} r={4} fill="#f2c94c" /> : null}
        </g>
      );
    case 'window': {
      const night = state === 'night';
      return (
        <g>
          <rect
            x={-62}
            y={-190}
            width={124}
            height={92}
            fill={night ? '#1d2550' : '#9fd8ff'}
            stroke="#f4efe6"
            strokeWidth={8}
          />
          {night ? (
            <circle cx={30} cy={-165} r={10} fill="#fff4c2" />
          ) : (
            <circle cx={-32} cy={-170} r={11} fill="#ffe27a" />
          )}
          <path d="M0 -190 V-98 M-62 -144 H62" stroke="#f4efe6" strokeWidth={5} />
        </g>
      );
    }
    case 'lamp': {
      const on = state === 'on';
      return (
        <g>
          {on ? <circle cx={0} cy={-120} r={50} fill="#ffe9a8" opacity={0.35} /> : null}
          <rect x={-3} y={-110} width={6} height={110} fill="#555" />
          <path d="M-24 -110 L-14 -140 L14 -140 L24 -110Z" fill={on ? '#ffe9a8' : '#c9c2b2'} />
        </g>
      );
    }
    case 'flag': {
      const up = state === 'up';
      return (
        <g>
          <rect x={-2} y={-150} width={4} height={150} fill="#777" />
          <path d={`M2 ${up ? -150 : -50} l46 14 l-46 14Z`} fill={accent} />
        </g>
      );
    }
  }
}
