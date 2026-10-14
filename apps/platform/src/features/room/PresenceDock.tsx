import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { OpenRoom } from '../../app/rooms';
import { conversationFor, useConversation, type Line } from './conversation';
import { words } from './PresenceLayer';
import { endCall, sayInCall, startCall, toggleMute, useCall } from './voiceCall';
import './dock.css';

const more = {
  ar: { history: 'المحادثة', fold: 'صغّر', unfold: 'كبّر المحادثة', call: 'مكالمة صوت' },
  en: {
    history: 'Conversation',
    fold: 'Fold',
    unfold: 'Open the conversation',
    call: 'Voice call',
  },
};

/** Repeated activity in a row (four meals added) reads as one line with a count. */
function folded(lines: Line[]) {
  const out: (Line & { times: number })[] = [];
  for (const line of lines) {
    const last = out.at(-1);
    if (last && line.kind === 'activity' && last.kind === 'activity' && last.text === line.text)
      last.times++;
    else out.push({ ...line, times: 1 });
  }
  return out;
}

/**
 * The characters beside a world that is a working interface: their conversation, typing and
 * a voice call are always at hand. A side column on wide screens, a sheet at the bottom on
 * phones that opens to the whole conversation.
 */
export function PresenceDock(props: { room: OpenRoom; ai: boolean | null; leave: string }) {
  const { room, ai } = props;
  const cast = room.spec.characters;
  const [who, setWho] = useState(cast[0].id);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const character = cast.find((c) => c.id === who) ?? cast[0];
  const conversation = conversationFor(room, character);
  const { lines, busy } = useConversation(conversation);
  const call = useCall();
  const t = { ...words[room.spec.language], ...more[room.spec.language] };
  const status =
    call.roomKey === room.key && call.character === character.id ? call.status : 'idle';
  const list = useRef<HTMLOListElement>(null);
  // While the AI is on, the character opens with its own words, so the fixed greeting steps aside.
  const shown = folded(ai && lines.length > 1 ? lines.slice(1) : lines);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [shown.length, open]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (!sayInCall(room, character, text)) void conversation.send(text);
  };
  const choose = (id: string) => {
    if (call.roomKey === room.key) void endCall();
    setWho(id);
  };

  return (
    <aside className="dock" data-open={open} aria-label={t.history}>
      <header className="dock-head">
        <a
          className="dock-leave"
          href={props.leave}
          aria-label={room.spec.language === 'ar' ? 'خروج' : 'Leave'}
        >
          ⌂
        </a>
        <div className="dock-cast" role="group" aria-label={t.with}>
          {cast.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === character.id}
              onClick={() => choose(c.id)}
            >
              <b>{c.name}</b>
              <small>{c.role}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="dock-fold"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? t.fold : t.unfold}
        </button>
      </header>
      <ol className="dock-lines" ref={list} aria-live="polite">
        {ai === false && <li className="dock-line dock-error">{t.closed}</li>}
        {status === 'error' && call.message && (
          <li className="dock-line dock-error">{call.message}</li>
        )}
        {shown.map((line) => (
          <li key={line.id} className={`dock-line dock-${line.kind}`}>
            {line.text}
            {line.times > 1 &&
              ` ×${line.times.toLocaleString(room.spec.language === 'ar' ? 'ar-EG' : 'en')}`}
          </li>
        ))}
        {busy && <li className="dock-line dock-agent dock-typing">…</li>}
      </ol>
      {ai && (
        <div className="dock-controls">
          <form className="dock-type" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.write}
              aria-label={`${t.write} ${character.name}`}
            />
            <button type="submit">{t.send}</button>
          </form>
          {status === 'live' || status === 'connecting' ? (
            <div className="dock-call" data-status={status}>
              <button
                type="button"
                onClick={toggleMute}
                aria-label={call.muted ? t.unmute : t.mute}
              >
                {call.muted ? '🔇' : '🎙️'}
              </button>
              <button type="button" onClick={() => void endCall()}>
                {t.end}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="dock-voice"
              onClick={() => void startCall(room, character)}
            >
              🎙️ <span>{t.call}</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
