import { type CharacterLook } from '../world/look';
import { shade } from '../color';
import type { RigFrame } from '../rig';
import type { Metrics } from './metrics';

type Props = { look: CharacterLook; m: Metrics; frame: RigFrame; cy: number };

/** Mouth from the face channels: a smile line when closed, an open shape when talking. */
function mouthPath(r: number, frame: RigFrame) {
  const { smile } = frame.face;
  // Rounded lips for OH/OO/WQ, pressed lips for MBP; the face's own roundness otherwise.
  const round = frame.lips && ['OH', 'OO', 'WQ'].includes(frame.lips) ? 1 : frame.face.round;
  if (frame.lips === 'MBP')
    return { d: `M${-r * 0.3} 0 Q0 ${r * 0.03} ${r * 0.3} 0`, filled: false };
  const open = frame.mouth;
  const w = r * 0.36 * (1 - round * 0.4);
  const corner = -smile * r * 0.1;
  if (open < 0.06)
    return { d: `M${-w} ${corner} Q0 ${smile * r * 0.16} ${w} ${corner}`, filled: false };
  const drop = open * r * 0.42;
  return {
    d: `M${-w} ${corner} Q0 ${-smile * r * 0.04 - drop * 0.15} ${w} ${corner} Q${w * 0.6} ${drop + smile * r * 0.12} 0 ${drop + smile * r * 0.1} Q${-w * 0.6} ${drop + smile * r * 0.12} ${-w} ${corner}Z`,
    filled: true,
  };
}

function Eye({
  look,
  r,
  frame,
  x,
}: {
  look: CharacterLook;
  r: number;
  frame: RigFrame;
  x: number;
}) {
  const style = look.parts.eyes;
  const size = look.age === 'child' ? 1.15 : 1;
  const open = Math.max(0, frame.face.eye * (1 - frame.blink) * (style === 'sleepy' ? 0.62 : 1));
  const rx = r * (style === 'almond' ? 0.21 : 0.17) * size;
  const ry = r * (style === 'almond' ? 0.14 : 0.2) * size * open;
  const look2 = frame.turn * r * 0.07;
  if (ry < 1)
    return (
      <path
        d={`M${x - rx} 0 Q${x} ${r * 0.05} ${x + rx} 0`}
        stroke={shade(look.palette.skin, 0.6)}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
    );
  const pupil = r * (style === 'sparkle' ? 0.14 : 0.1) * size;
  return (
    <g>
      <ellipse
        cx={x}
        cy={0}
        rx={rx}
        ry={ry}
        fill="#fff"
        stroke={shade(look.palette.skin, 0.45)}
        strokeWidth={1}
      />
      <circle cx={x + look2} cy={0} r={Math.min(pupil, ry)} fill={look.palette.eyes} />
      <circle
        cx={x + look2 + pupil * 0.35}
        cy={-pupil * 0.35}
        r={pupil * 0.32}
        fill="#fff"
        opacity={0.9}
      />
      {style === 'sparkle' ? (
        <circle cx={x + look2 - pupil * 0.4} cy={pupil * 0.4} r={pupil * 0.18} fill="#fff" />
      ) : null}
    </g>
  );
}

export function Head({ look, m, frame, cy }: Props) {
  const r = m.head;
  const { face } = frame;
  const shift = frame.turn * r * 0.18;
  const eyeY = -r * 0.02;
  const gap = r * 0.4;
  const browY = eyeY - r * 0.33 - face.brow * r * 0.1;
  const mouth = mouthPath(r, frame);
  const skinLine = shade(look.palette.skin, 0.3);
  const hijab = look.parts.hair === 'hijab';
  return (
    <g transform={`translate(0 ${cy})`}>
      {!hijab
        ? [-1, 1].map((s) => (
            <ellipse
              key={s}
              cx={s * r * 0.93}
              cy={r * 0.08}
              rx={r * 0.17}
              ry={r * 0.24}
              fill={look.palette.skin}
              stroke={skinLine}
              strokeWidth={1}
            />
          ))
        : null}
      <ellipse
        cx={0}
        cy={0}
        rx={r * 0.92}
        ry={r}
        fill={look.palette.skin}
        stroke={skinLine}
        strokeWidth={1.2}
      />
      <g transform={`translate(${shift} 0)`}>
        <g transform={`translate(0 ${eyeY})`}>
          <Eye look={look} r={r} frame={frame} x={-gap} />
          <Eye look={look} r={r} frame={frame} x={gap} />
        </g>
        {[-1, 1].map((s) => (
          <path
            key={s}
            d={`M${s * (gap - r * 0.18)} ${browY - face.worry * r * 0.1} L${s * (gap + r * 0.18)} ${browY + face.worry * r * 0.05}`}
            stroke={shade(look.palette.hair, 0.15)}
            strokeWidth={r * 0.08}
            strokeLinecap="round"
          />
        ))}
        <path
          d={`M${-r * 0.04} ${r * 0.22} Q${r * 0.05} ${r * 0.3} ${-r * 0.02} ${r * 0.34}`}
          stroke={skinLine}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        {[-1, 1].map((s) => (
          <ellipse
            key={s}
            cx={s * r * 0.55}
            cy={r * 0.36}
            rx={r * 0.16}
            ry={r * 0.09}
            fill="#ff7a8a"
            opacity={face.blush * 0.45}
          />
        ))}
        <g transform={`translate(0 ${r * 0.55})`}>
          <path
            d={mouth.d}
            fill={mouth.filled ? '#7a2e3a' : 'none'}
            stroke={shade(look.palette.skin, 0.55)}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  );
}
