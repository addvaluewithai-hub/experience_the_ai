import type { CharacterLook } from '@experience/room-spec';
import { memo } from 'react';
import type { RigFrame } from '../rig';
import { Arms, Back, Legs, skeleton, Torso } from './Body';
import { HairBack, HairFront } from './Hair';
import { Head } from './Head';
import { metricsOf } from './metrics';

/**
 * A humanoid drawn from its look recipe and one rig frame, in its own units with the feet at
 * the origin, facing right. The stage places, scales and mirrors it.
 */
export const Humanoid = memo(function Humanoid({
  look,
  frame,
}: {
  look: CharacterLook;
  frame: RigFrame;
}) {
  const m = metricsOf(look);
  const bones = skeleton(m, frame);
  const props = { look, m, frame, bones };
  const neckX = 0;
  return (
    <g>
      <Back {...props} />
      <HairBack look={look} r={m.head} cy={bones.headY} />
      <Legs {...props} />
      <path
        d={`M${neckX - m.limb * 0.55} ${bones.shoulderY + 2} L${neckX - m.limb * 0.5} ${bones.neckTop} L${neckX + m.limb * 0.5} ${bones.neckTop} L${neckX + m.limb * 0.55} ${bones.shoulderY + 2}Z`}
        fill={look.palette.skin}
      />
      <Torso {...props} />
      <g transform={`rotate(${frame.head.toFixed(2)} 0 ${bones.neckTop.toFixed(1)})`}>
        <Head look={look} m={m} frame={frame} cy={bones.headY} />
        <HairFront look={look} r={m.head} cy={bones.headY} />
      </g>
      <Arms {...props} />
    </g>
  );
});
