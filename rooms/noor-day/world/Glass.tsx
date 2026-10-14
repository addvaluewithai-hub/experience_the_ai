import { GLASSES } from './day';

const ar = (n: number) => n.toLocaleString('ar-EG');

/** The one moving thing on the board: a tall glass that fills one glass of water at a time. */
export function Glass(props: { glasses: number; change: (glasses: number) => void }) {
  const level = Math.min(GLASSES, Math.max(0, props.glasses)) / GLASSES;
  const top = 26 + (1 - level) * 178;
  return (
    <figure className="glass" aria-label={`المية: ${ar(props.glasses)} من ${ar(GLASSES)} كوبايات`}>
      <svg viewBox="0 0 120 220" role="img" aria-hidden="true">
        <defs>
          <clipPath id="glass-inside">
            <path d="M22 20 L98 20 L90 206 Q60 214 30 206 Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#glass-inside)">
          <g className="glass-water" style={{ transform: `translateY(${top}px)` }}>
            <path d="M0 6 Q30 0 60 6 T120 6 V220 H0 Z" />
          </g>
        </g>
        <path className="glass-rim" d="M22 20 L98 20 L90 206 Q60 214 30 206 Z" />
        {Array.from({ length: GLASSES - 1 }, (_, i) => (
          <line
            key={i}
            x1="92"
            x2="98"
            y1={26 + ((i + 1) * 178) / GLASSES}
            y2={26 + ((i + 1) * 178) / GLASSES}
          />
        ))}
      </svg>
      <figcaption>
        <strong>{ar(props.glasses)}</strong> من {ar(GLASSES)} كوبايات
      </figcaption>
      <div className="glass-buttons">
        <button type="button" onClick={() => props.change(props.glasses + 1)}>
          + كوباية
        </button>
        <button
          type="button"
          className="glass-less"
          disabled={props.glasses <= 0}
          onClick={() => props.change(props.glasses - 1)}
          aria-label="شيل كوباية"
        >
          −
        </button>
      </div>
    </figure>
  );
}
