import type { FormEvent } from 'react';

export function NumberPad(props: {
  entry: string;
  setEntry: (value: string) => void;
  submit: (e: FormEvent) => void;
}) {
  const { entry, setEntry, submit } = props;
  return (
    <form className="cf-controls" onSubmit={submit} aria-label="اختيار الناتج">
      <label className="cf-input-label" htmlFor="cube-number">
        اختاري الناتج
      </label>
      <input
        id="cube-number"
        className="cf-number-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label="الناتج"
        value={entry}
        placeholder="?"
        onChange={(e) => setEntry(e.target.value.replace(/\D/g, '').slice(0, 3))}
      />
      <div className="cf-keypad">
        {keys.map((key) => (
          <button
            className="cf-key"
            key={key}
            type="button"
            disabled={entry.length === 3}
            onClick={() => setEntry((entry + key).slice(0, 3))}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="cf-entry-actions">
        <button className="cf-backspace" type="button" onClick={() => setEntry(entry.slice(0, -1))}>
          ⌫ <span>مسح</span>
        </button>
        <button className="cf-submit" type="submit" disabled={!entry}>
          تأكيد <span>↵</span>
        </button>
      </div>
    </form>
  );
}
