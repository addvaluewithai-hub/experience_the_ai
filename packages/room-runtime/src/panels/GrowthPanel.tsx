import { wordsFor } from '../words';
import { doneCount, type PanelProps } from './types';

/** Planting order: from the top of the planet outward, alternating sides. */
const SPOTS = Array.from({ length: 16 }, (_, i) => {
  const step = Math.ceil(i / 2) * (i % 2 ? 1 : -1);
  const angle = -Math.PI / 2 + step * 0.17;
  return { x: 120 + Math.cos(angle) * 76, y: 108 + Math.sin(angle) * 76 };
});

function Plant({ x, y, index }: { x: number; y: number; index: number }) {
  const tall = 16 + (index % 3) * 5;
  return (
    <g className="room-plant" style={{ animationDelay: `${index * 40}ms` }}>
      <line x1={x} y1={y} x2={x} y2={y - tall} />
      {index % 4 === 3 ? (
        <circle cx={x} cy={y - tall - 4} r={6} className="room-flower" />
      ) : (
        <ellipse cx={x} cy={y - tall - 6} rx={8} ry={11} className="room-leaf" />
      )}
    </g>
  );
}

/**
 * A 2.5D world that grows one plant per done record. It reads the same data as every other
 * panel, so an agent marking a habit done and a child ticking it look identical here.
 */
export function GrowthPanel({ spec, panel, data }: PanelProps) {
  const words = wordsFor(spec.language);
  const { done, total } = doneCount(data, panel);
  const stage = Math.min(words.stages.length - 1, Math.floor(done / 3));
  return (
    <figure className="room-growth">
      <svg viewBox="0 -28 240 228" role="img" aria-label={`${words.stages[stage]} · ${done}`}>
        <defs>
          <radialGradient id={`planet-${panel.id}`} cx="35%" cy="30%" r="80%">
            <stop offset="0%" className="room-planet-light" />
            <stop offset="100%" className="room-planet-dark" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="194" rx="64" ry="6" className="room-planet-shadow" />
        <circle cx="120" cy="108" r="80" fill={`url(#planet-${panel.id})`} />
        <ellipse cx="120" cy="116" rx="106" ry="18" className="room-planet-ring" />
        {SPOTS.slice(0, done).map((spot, i) => (
          <Plant key={i} index={i} {...spot} />
        ))}
      </svg>
      <figcaption>
        <strong>{words.stages[stage]}</strong> · {done} {words.of} {total} {words.done}
      </figcaption>
    </figure>
  );
}
