import { wordsFor } from '../words';
import { doneCount, type PanelProps } from './types';

export function StatPanel({ spec, panel, collection, data }: PanelProps) {
  const records = data[collection?.id ?? ''] ?? [];
  const field = panel.field;
  const value = field
    ? records.reduce(
        (sum, r) => sum + (typeof r.values[field] === 'number' ? r.values[field] : 0),
        0,
      )
    : records.length;
  const unit = field ? collection?.fields.find((f) => f.id === field)?.label : collection?.label;
  return (
    <p className="room-stat">
      <strong>{value.toLocaleString(spec.language)}</strong>
      <span>{field ? unit : `${wordsFor(spec.language).total} · ${unit}`}</span>
    </p>
  );
}

export function ProgressPanel({ spec, panel, data }: PanelProps) {
  const words = wordsFor(spec.language);
  const { done, total } = doneCount(data, panel);
  const share = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="room-progress">
      <div
        className="room-progress-track"
        role="progressbar"
        aria-label={panel.title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={share}
      >
        <span style={{ inlineSize: `${share}%` }} />
      </div>
      <p>
        <strong>{share}%</strong> · {done} {words.of} {total} {words.done}
      </p>
    </div>
  );
}

export function TextPanel({ panel }: PanelProps) {
  return <p className="room-text">{panel.text}</p>;
}
