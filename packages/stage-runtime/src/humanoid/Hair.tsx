import type { CharacterLook } from '@experience/room-spec';
import { shade, tint } from '../color';

type Props = { look: CharacterLook; r: number; cy: number };

/** Hair and headwear behind the head (long hair, buns, a hijab's drape). */
export function HairBack({ look, r, cy }: Props) {
  const hair = look.palette.hair;
  const edge = shade(hair, 0.25);
  switch (look.parts.hair) {
    case 'long':
      return (
        <path
          d={`M${-r * 1.02} ${cy} Q${-r * 1.15} ${cy + r * 1.9} ${-r * 0.6} ${cy + r * 2} L${r * 0.6} ${cy + r * 2} Q${r * 1.15} ${cy + r * 1.9} ${r * 1.02} ${cy}Z`}
          fill={hair}
          stroke={edge}
          strokeWidth={1.2}
        />
      );
    case 'bob':
      return (
        <path
          d={`M${-r * 1.05} ${cy} Q${-r * 1.12} ${cy + r * 0.95} ${-r * 0.7} ${cy + r * 0.95} L${r * 0.7} ${cy + r * 0.95} Q${r * 1.12} ${cy + r * 0.95} ${r * 1.05} ${cy}Z`}
          fill={hair}
          stroke={edge}
          strokeWidth={1.2}
        />
      );
    case 'ponytail':
      return (
        <path
          d={`M${r * 0.7} ${cy - r * 0.6} Q${r * 1.6} ${cy - r * 0.2} ${r * 1.25} ${cy + r * 1.3} Q${r * 1.05} ${cy + r * 0.4} ${r * 0.6} ${cy - r * 0.2}Z`}
          fill={hair}
          stroke={edge}
          strokeWidth={1.2}
        />
      );
    case 'bun':
      return (
        <circle
          cx={0}
          cy={cy - r * 1.12}
          r={r * 0.42}
          fill={hair}
          stroke={edge}
          strokeWidth={1.2}
        />
      );
    case 'hijab':
      return (
        <path
          d={`M${-r * 1.18} ${cy - r * 0.2} Q${-r * 1.25} ${cy - r * 1.3} 0 ${cy - r * 1.28} Q${r * 1.25} ${cy - r * 1.3} ${r * 1.18} ${cy - r * 0.2} L${r * 1.45} ${cy + r * 1.75} L${-r * 1.45} ${cy + r * 1.75}Z`}
          fill={hair}
          stroke={edge}
          strokeWidth={1.2}
        />
      );
    default:
      return null;
  }
}

/** Fringes, caps and everything worn on the face, drawn over the head. */
export function HairFront({ look, r, cy }: Props) {
  const hair = look.palette.hair;
  const edge = shade(hair, 0.25);
  const style = look.parts.hair;
  const accessories = look.parts.accessories;
  const cap = `M${-r * 1.02} ${cy - r * 0.15} Q${-r * 1.05} ${cy - r * 1.15} 0 ${cy - r * 1.12} Q${r * 1.05} ${cy - r * 1.15} ${r * 1.02} ${cy - r * 0.15}`;
  let front = null;
  if (
    style === 'short' ||
    style === 'long' ||
    style === 'bob' ||
    style === 'bun' ||
    style === 'ponytail'
  )
    front = (
      <path
        d={`${cap} Q${r * 0.75} ${cy - r * 0.78} ${r * 0.1} ${cy - r * 0.72} Q${-r * 0.55} ${cy - r * 0.62} ${-r * 1.02} ${cy - r * 0.15}Z`}
        fill={hair}
        stroke={edge}
        strokeWidth={1.2}
      />
    );
  else if (style === 'curly')
    front = (
      <g fill={hair} stroke={edge} strokeWidth={1}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI * (1.05 + (i / 8) * 0.9);
          return (
            <circle
              key={i}
              cx={Math.cos(a) * r * 0.9}
              cy={cy + Math.sin(a) * r * 0.92}
              r={r * 0.3}
            />
          );
        })}
      </g>
    );
  else if (style === 'spiky')
    front = (
      <path
        d={`M${-r} ${cy - r * 0.3} L${-r * 0.9} ${cy - r * 1.3} L${-r * 0.45} ${cy - r * 0.95} L${-r * 0.2} ${cy - r * 1.45} L${r * 0.15} ${cy - r * 0.98} L${r * 0.5} ${cy - r * 1.4} L${r * 0.7} ${cy - r * 0.9} L${r} ${cy - r * 1.15} L${r} ${cy - r * 0.3} Q0 ${cy - r * 0.75} ${-r} ${cy - r * 0.3}Z`}
        fill={hair}
        stroke={edge}
        strokeWidth={1.2}
      />
    );
  else if (style === 'hijab')
    front = (
      <path
        fillRule="evenodd"
        d={`M${-r * 1.2} ${cy + r * 0.4} Q${-r * 1.3} ${cy - r * 1.35} 0 ${cy - r * 1.32} Q${r * 1.3} ${cy - r * 1.35} ${r * 1.2} ${cy + r * 0.4} Q${r * 1.1} ${cy + r * 1.25} 0 ${cy + r * 1.3} Q${-r * 1.1} ${cy + r * 1.25} ${-r * 1.2} ${cy + r * 0.4}Z M${-r * 0.8} ${cy - r * 0.1} Q${-r * 0.82} ${cy - r * 0.92} 0 ${cy - r * 0.92} Q${r * 0.82} ${cy - r * 0.92} ${r * 0.8} ${cy - r * 0.1} Q${r * 0.78} ${cy + r * 0.95} 0 ${cy + r * 0.98} Q${-r * 0.78} ${cy + r * 0.95} ${-r * 0.8} ${cy - r * 0.1}Z`}
        fill={hair}
        stroke={edge}
        strokeWidth={1.2}
      />
    );
  const eyeY = cy - r * 0.02;
  const accent = look.palette.top;
  return (
    <g>
      {front}
      {accessories.includes('headband') ? (
        <path
          d={`M${-r * 0.98} ${cy - r * 0.45} Q0 ${cy - r * 1.25} ${r * 0.98} ${cy - r * 0.45}`}
          stroke={accent}
          strokeWidth={r * 0.14}
          fill="none"
        />
      ) : null}
      {accessories.includes('bow') ? (
        <path
          d={`M${r * 0.55} ${cy - r * 0.95} l${-r * 0.32} ${-r * 0.2} l0 ${r * 0.4}Z M${r * 0.55} ${cy - r * 0.95} l${r * 0.32} ${-r * 0.2} l0 ${r * 0.4}Z`}
          fill="#ff5d8f"
        />
      ) : null}
      {accessories.includes('cap') ? (
        <g fill={accent} stroke={shade(accent, 0.3)} strokeWidth={1.2}>
          <path d={`${cap} Q0 ${cy - r * 0.55} ${-r * 1.02} ${cy - r * 0.15}Z`} />
          <path
            d={`M${-r * 0.2} ${cy - r * 0.5} Q${r * 0.8} ${cy - r * 0.62} ${r * 1.45} ${cy - r * 0.38} Q${r * 0.8} ${cy - r * 0.3} ${-r * 0.2} ${cy - r * 0.42}Z`}
            fill={shade(accent, 0.12)}
          />
        </g>
      ) : null}
      {accessories.includes('glasses') ? (
        <g fill={tint('#a8d8ff', 0.4)} fillOpacity={0.25} stroke="#2b2b33" strokeWidth={2}>
          <circle cx={-r * 0.4} cy={eyeY} r={r * 0.27} />
          <circle cx={r * 0.4} cy={eyeY} r={r * 0.27} />
          <path d={`M${-r * 0.13} ${eyeY} Q0 ${eyeY - r * 0.08} ${r * 0.13} ${eyeY}`} fill="none" />
        </g>
      ) : null}
      {accessories.includes('headset') ? (
        <g fill="none" stroke="#2b2b33" strokeWidth={r * 0.1} strokeLinecap="round">
          <path
            d={`M${-r * 0.98} ${cy} Q${-r * 1.05} ${cy - r * 1.3} 0 ${cy - r * 1.28} Q${r * 1.05} ${cy - r * 1.3} ${r * 0.98} ${cy}`}
          />
          <rect
            x={r * 0.86}
            y={cy - r * 0.15}
            width={r * 0.28}
            height={r * 0.42}
            rx={r * 0.1}
            fill="#2b2b33"
          />
          <path
            d={`M${r} ${cy + r * 0.25} Q${r * 0.85} ${cy + r * 0.75} ${r * 0.3} ${cy + r * 0.72}`}
            strokeWidth={r * 0.06}
          />
        </g>
      ) : null}
    </g>
  );
}
