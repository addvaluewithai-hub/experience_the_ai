import type { CharacterLook } from '@experience/room-spec';
import { shade, tint } from '../color';
import { mix } from '../project';
import type { RigFrame } from '../rig';
import { legLength, type Metrics } from './metrics';

/** Where the body's joints are for this frame, in the character's own units (feet at 0). */
export function skeleton(m: Metrics, frame: RigFrame) {
  const hipY = mix(-legLength(m), -frame.seat, frame.sit);
  const shoulderY = hipY - m.torso;
  const neckTop = shoulderY - m.neck;
  return { hipY, shoulderY, neckTop, headY: neckTop - m.head * 0.92 };
}
type Bones = ReturnType<typeof skeleton>;
type Props = { look: CharacterLook; m: Metrics; frame: RigFrame; bones: Bones };

const LONG_SLEEVES = new Set(['hoodie', 'shirt', 'blazer', 'sweater', 'spacesuit']);
const limbPath = (points: number[][]) =>
  `M${points.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}`;

export function Back({ look, m, frame, bones }: Props) {
  const { accessories } = look.parts;
  const y = bones.shoulderY;
  return (
    <g>
      {accessories.includes('jetpack') ? (
        <g>
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect
                x={s * (m.shoulder + 3) - 9}
                y={y + 4}
                width={18}
                height={m.torso * 0.7}
                rx={8}
                fill="#9aa3b2"
                stroke="#5c6474"
                strokeWidth={2}
              />
              {frame.height > 0.03 ? (
                <path
                  d={`M${s * (m.shoulder + 3) - 7} ${y + 4 + m.torso * 0.7} Q${s * (m.shoulder + 3)} ${y + m.torso * 1.25 + Math.sin(frame.walk * 9 + s) * 4} ${s * (m.shoulder + 3) + 7} ${y + 4 + m.torso * 0.7}Z`}
                  fill="#ffb347"
                  opacity={0.9}
                />
              ) : null}
            </g>
          ))}
        </g>
      ) : null}
      {accessories.includes('backpack') ? (
        <rect
          x={-m.shoulder * 0.85}
          y={y + 6}
          width={m.shoulder * 1.7}
          height={m.torso * 0.75}
          rx={10}
          fill={shade(look.palette.top, 0.35)}
        />
      ) : null}
    </g>
  );
}

export function Legs({ look, m, frame, bones }: Props) {
  const { palette, parts } = look;
  const bareShins = parts.bottom === 'shorts' || parts.bottom === 'skirt' || parts.top === 'dress';
  const legs = [-1, 1].map((s) => {
    const lift =
      frame.moving && frame.height < 0.02
        ? Math.max(0, Math.sin(frame.walk + (s > 0 ? Math.PI : 0))) * 7
        : 0;
    const hip = [s * m.hip * 0.5, bones.hipY];
    const standKnee = [s * m.hip * 0.5, bones.hipY + m.thigh - lift * 0.5];
    const standFoot = [s * m.hip * 0.55, -lift];
    const sitKnee = [s * m.hip * 0.75, bones.hipY + m.thigh * 0.22];
    const sitFoot = [s * m.hip * 0.8, Math.min(0, sitKnee[1] + m.shin)];
    const t = frame.sit;
    const knee = [mix(standKnee[0], sitKnee[0], t), mix(standKnee[1], sitKnee[1], t)];
    const foot = [mix(standFoot[0], sitFoot[0], t), mix(standFoot[1], sitFoot[1], t)];
    return { s, hip, knee, foot };
  });
  const lower = bareShins ? palette.skin : palette.bottom;
  const upper = parts.top === 'dress' || parts.bottom === 'skirt' ? palette.skin : palette.bottom;
  return (
    <g strokeLinecap="round" fill="none">
      {legs.map(({ s, hip, knee, foot }) => (
        <g key={s}>
          <path d={limbPath([knee, foot])} stroke={lower} strokeWidth={m.limb * 1.1} />
          <path d={limbPath([hip, knee])} stroke={upper} strokeWidth={m.limb * 1.3} />
          {parts.bottom === 'shorts' ? (
            <path
              d={limbPath([hip, [mix(hip[0], knee[0], 0.6), mix(hip[1], knee[1], 0.6)]])}
              stroke={palette.bottom}
              strokeWidth={m.limb * 1.45}
            />
          ) : null}
          <ellipse
            cx={foot[0] + s * 3}
            cy={foot[1] - 3}
            rx={m.limb * 0.9}
            ry={m.limb * 0.5}
            fill={palette.shoes}
          />
        </g>
      ))}
    </g>
  );
}

export function Torso({ look, m, frame, bones }: Props) {
  const { palette, parts } = look;
  const top = bones.shoulderY;
  const dress = parts.top === 'dress';
  const skirt = parts.bottom === 'skirt' && !dress;
  const bottom = bones.hipY + (dress ? mix(m.thigh * 0.85, m.thigh * 0.35, frame.sit) : 5);
  const sw = m.shoulder;
  const hw = m.hip * (dress ? mix(1.55, 1.25, frame.sit) : 1.08);
  const body = `M${-sw + 7} ${top} Q${-sw} ${top} ${-sw} ${top + 9} L${-hw} ${bottom} Q0 ${bottom + 4} ${hw} ${bottom} L${sw} ${top + 9} Q${sw} ${top} ${sw - 7} ${top}Z`;
  const fill = parts.top === 'spacesuit' ? '#e9edf3' : palette.top;
  return (
    <g>
      {skirt ? (
        <path
          d={`M${-m.hip * 1.1} ${bones.hipY - 4} L${-m.hip * 1.55} ${bones.hipY + m.thigh * mix(0.6, 0.25, frame.sit)} L${m.hip * 1.55} ${bones.hipY + m.thigh * mix(0.6, 0.25, frame.sit)} L${m.hip * 1.1} ${bones.hipY - 4}Z`}
          fill={palette.bottom}
        />
      ) : null}
      {parts.top === 'hoodie' ? (
        <path
          d={`M${-sw * 0.6} ${top + 2} Q0 ${top - 12} ${sw * 0.6} ${top + 2}`}
          stroke={shade(fill, 0.2)}
          strokeWidth={9}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
      <path d={body} fill={fill} stroke={shade(fill, 0.25)} strokeWidth={1.5} />
      {parts.top === 'blazer' ? (
        <>
          <path
            d={`M${-sw * 0.35} ${top} L0 ${top + m.torso * 0.55} L${sw * 0.35} ${top}Z`}
            fill="#fbf7ef"
          />
          <path
            d={`M${-sw * 0.4} ${top} L${-sw * 0.05} ${top + m.torso * 0.5} M${sw * 0.4} ${top} L${sw * 0.05} ${top + m.torso * 0.5}`}
            stroke={shade(fill, 0.35)}
            strokeWidth={2}
          />
        </>
      ) : null}
      {parts.top === 'shirt' ? (
        <path
          d={`M${-sw * 0.3} ${top} L0 ${top + 9} L${sw * 0.3} ${top}`}
          fill={tint(fill, 0.5)}
          stroke={shade(fill, 0.3)}
          strokeWidth={1.2}
        />
      ) : null}
      {parts.top === 'hoodie' ? (
        <rect
          x={-sw * 0.5}
          y={bones.hipY - m.torso * 0.32}
          width={sw}
          height={m.torso * 0.2}
          rx={5}
          fill={shade(fill, 0.12)}
        />
      ) : null}
      {parts.top === 'sweater' ? (
        <path
          d={`M${-hw} ${bottom - 5} L${hw} ${bottom - 5}`}
          stroke={shade(fill, 0.2)}
          strokeWidth={4}
        />
      ) : null}
      {parts.top === 'spacesuit' ? (
        <>
          <rect
            x={-sw * 0.45}
            y={top + m.torso * 0.25}
            width={sw * 0.9}
            height={m.torso * 0.28}
            rx={4}
            fill={palette.top}
          />
          <circle cx={-sw * 0.2} cy={top + m.torso * 0.39} r={2.6} fill="#ffd166" />
          <circle cx={sw * 0.2} cy={top + m.torso * 0.39} r={2.6} fill="#06d6a0" />
        </>
      ) : null}
      {parts.accessories.includes('backpack') ? (
        <path
          d={`M${-sw * 0.62} ${top + 2} L${-sw * 0.5} ${top + m.torso * 0.7} M${sw * 0.62} ${top + 2} L${sw * 0.5} ${top + m.torso * 0.7}`}
          stroke={shade(palette.top, 0.45)}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : null}
      {parts.accessories.includes('scarf') ? (
        <path
          d={`M${-sw * 0.55} ${top - 2} Q0 ${top + 9} ${sw * 0.55} ${top - 2} L${sw * 0.35} ${top + 26}`}
          stroke="#e63946"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

export function Arms({ look, m, frame, bones }: Props) {
  const { palette, parts } = look;
  const sleeve = parts.top === 'spacesuit' ? '#e9edf3' : palette.top;
  const fore = LONG_SLEEVES.has(parts.top) ? sleeve : palette.skin;
  const rad = Math.PI / 180;
  return (
    <g strokeLinecap="round" fill="none">
      {(['a', 'b'] as const).map((side) => {
        const s = side === 'a' ? -1 : 1;
        const [upperAngle, elbowAngle] = frame.arms[side];
        const shoulder = [s * (m.shoulder - m.limb * 0.45), bones.shoulderY + m.limb * 0.6];
        const elbow = [
          shoulder[0] + s * Math.sin(upperAngle * rad) * m.upper,
          shoulder[1] + Math.cos(upperAngle * rad) * m.upper,
        ];
        const total = (upperAngle + elbowAngle) * rad;
        const hand = [elbow[0] + s * Math.sin(total) * m.fore, elbow[1] + Math.cos(total) * m.fore];
        return (
          <g key={side}>
            <path d={limbPath([shoulder, elbow])} stroke={sleeve} strokeWidth={m.limb * 1.15} />
            <path d={limbPath([elbow, hand])} stroke={fore} strokeWidth={m.limb} />
            <circle cx={hand[0]} cy={hand[1]} r={m.limb * 0.62} fill={palette.skin} />
          </g>
        );
      })}
    </g>
  );
}
