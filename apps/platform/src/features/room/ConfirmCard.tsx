import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAsk } from './confirm';
import './confirm.css';

/** The person's own yes or no before a character changes their records outside the room. */
export function ConfirmCard() {
  const ask = useAsk();
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => yes.current?.focus(), [ask?.id]);
  if (!ask) return null;
  return createPortal(
    <div
      className="confirm-card"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-details"
    >
      <span className="confirm-who">{ask.who} asks</span>
      <h2 id="confirm-title">{ask.label}</h2>
      <ul id="confirm-details">
        {ask.details.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="confirm-actions">
        <button type="button" className="confirm-no" onClick={() => ask.answer(false)}>
          Not now
        </button>
        <button type="button" ref={yes} onClick={() => ask.answer(true)}>
          Confirm
        </button>
      </div>
    </div>,
    document.body,
  );
}
