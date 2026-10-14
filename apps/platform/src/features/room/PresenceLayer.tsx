import { useState, type FormEvent } from 'react';
import type { OpenRoom } from '../../app/rooms';
import { conversationFor, useConversation, type Line } from './conversation';
import { endCall, sayInCall, startCall, toggleMute, useCall } from './voiceCall';

export const words = {
  ar: {
    begin: 'يلا نبدأ ✨',
    waking: 'لحظة…',
    end: 'إنهاء',
    mute: 'كتم المايك',
    unmute: 'رجّع المايك',
    keyboard: 'كتابة بدل الصوت',
    write: 'اكتب هنا…',
    send: 'إرسال',
    closed: 'الشخصيات مش شغالة على النسخة دي لسه.',
    with: 'مع مين؟',
  },
  en: {
    begin: "Let's begin ✨",
    waking: 'One moment…',
    end: 'End',
    mute: 'Mute the mic',
    unmute: 'Unmute the mic',
    keyboard: 'Type instead of talking',
    write: 'Type here…',
    send: 'Send',
    closed: 'Characters are not live on this deployment yet.',
    with: 'Who with?',
  },
};

/** The last thing said, as captions: the character's words, and the person's when they wait. */
function captions(lines: Line[]) {
  const said = lines.slice(1).filter((l) => l.kind !== 'activity');
  const last = said.at(-1);
  if (!last) return [];
  const before = said.at(-2);
  return last.kind !== 'person' && before?.kind === 'person' ? [before, last] : [last];
}

/**
 * How a person meets the characters of an immersive room: one tap begins a voice call and the
 * character speaks first; captions float over the world; a small keyboard stands in for voice.
 */
export function PresenceLayer({
  room,
  ai,
  hidden = false,
}: {
  room: OpenRoom;
  ai: boolean | null;
  /** While a scene plays the world speaks for itself. */
  hidden?: boolean;
}) {
  const cast = room.spec.characters;
  const [who, setWho] = useState(cast[0].id);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const character = cast.find((c) => c.id === who) ?? cast[0];
  const conversation = conversationFor(room, character);
  const { lines } = useConversation(conversation);
  const call = useCall();
  const t = words[room.spec.language];
  const mine = call.roomKey === room.key && call.character === character.id;
  const status = mine ? call.status : 'idle';

  const choose = (id: string) => {
    if (id === who) return;
    if (call.roomKey === room.key) void endCall();
    setWho(id);
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (!sayInCall(room, character, text)) void conversation.send(text);
  };

  if (hidden) return null;
  return (
    <>
      {cast.length > 1 && (
        <div className="immersive-cast" role="group" aria-label={t.with}>
          {cast.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === character.id}
              onClick={() => choose(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="immersive-bottom">
        <div className="immersive-captions" aria-live="polite">
          {ai === false && <p className="caption">{t.closed}</p>}
          {status === 'error' && call.message && <p className="caption">{call.message}</p>}
          {captions(lines).map((line) => (
            <p key={line.id} className={`caption caption-${line.kind}`}>
              {line.text}
            </p>
          ))}
        </div>
        {ai && (
          <div className="immersive-controls">
            {status === 'live' || status === 'connecting' ? (
              <>
                <span className="immersive-live" data-status={status}>
                  {status === 'connecting' ? t.waking : character.name}
                </span>
                <button type="button" className="round" onClick={toggleMute}>
                  <span aria-hidden="true">{call.muted ? '🔇' : '🎙️'}</span>
                  <span className="sr-only">{call.muted ? t.unmute : t.mute}</span>
                </button>
                <button type="button" className="round" onClick={() => void endCall()}>
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">{t.end}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="immersive-begin"
                onClick={() => void startCall(room, character, { greet: true })}
              >
                {t.begin}
              </button>
            )}
            <button
              type="button"
              className="round"
              aria-expanded={typing}
              onClick={() => setTyping(!typing)}
            >
              <span aria-hidden="true">⌨️</span>
              <span className="sr-only">{t.keyboard}</span>
            </button>
          </div>
        )}
        {ai && typing && (
          <form className="immersive-type" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.write}
              aria-label={`${t.write} ${character.name}`}
              autoFocus
            />
            <button type="submit">{t.send}</button>
          </form>
        )}
      </div>
    </>
  );
}
