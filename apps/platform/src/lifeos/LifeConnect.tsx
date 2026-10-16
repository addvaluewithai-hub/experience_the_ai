import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { reloadLifeos, signIn, signOut, useLifeos } from './connection';
import './lifeos.css';

/**
 * A quiet corner of a room whose tree opens rooms from LifeOS: one line saying how the link
 * stands, and a sheet to sign in with the person's own LifeOS account. Nothing appears on a
 * deployment that names no LifeOS project.
 */
export function LifeConnect() {
  const lifeos = useLifeos();
  const [open, setOpen] = useState(false);
  if (lifeos.status === 'off') return null;
  const ready = lifeos.status === 'ready';
  return (
    <div className="lifeos-link">
      <span className={`lifeos-dot lifeos-dot-${lifeos.status}`} aria-hidden="true" />
      {lifeos.status === 'signed-out' && (
        <button type="button" onClick={() => setOpen(true)}>
          Connect your life
        </button>
      )}
      {lifeos.status === 'loading' && <span role="status">Opening your goals…</span>}
      {lifeos.status === 'error' && (
        <button type="button" onClick={() => void reloadLifeos()} title={lifeos.error}>
          LifeOS did not answer · Try again
        </button>
      )}
      {ready && (
        <>
          <span>Your goals are here</span>
          <button type="button" className="lifeos-quiet" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      )}
      {open &&
        lifeos.status === 'signed-out' &&
        // The pill's blur would hold a fixed sheet inside it; the sheet belongs to the page.
        createPortal(<SignInSheet close={() => setOpen(false)} />, document.body)}
    </div>
  );
}

function SignInSheet(props: { close: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const first = useRef<HTMLInputElement>(null);
  const close = useRef(props.close);
  close.current = props.close;
  useEffect(() => {
    first.current?.focus();
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && close.current();
    addEventListener('keydown', escape);
    return () => removeEventListener('keydown', escape);
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      props.close();
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="lifeos-veil" onClick={props.close}>
      <form
        className="lifeos-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lifeos-sheet-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void submit(event)}
      >
        <span className="lifeos-kicker">LIFEOS</span>
        <h2 id="lifeos-sheet-title">Your life, connected.</h2>
        <p>Sign in with your LifeOS account. Your goals open here as rooms; they stay yours.</p>
        <label>
          Email
          <input
            ref={first}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="lifeos-error" role="alert">
            {error}
          </p>
        )}
        <div className="lifeos-actions">
          <button type="button" className="lifeos-quiet" onClick={props.close}>
            Not now
          </button>
          <button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
