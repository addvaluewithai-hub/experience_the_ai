import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Character } from '@experience/room-spec';
import type { OpenRoom } from '../../app/rooms';
import { conversationFor, useConversation } from './conversation';

const labels = {
  en: { talk: 'Talk to', send: 'Send', stop: 'Stop', closed: 'Characters are not live here yet' },
  ar: { talk: 'كلّم', send: 'إرسال', stop: 'إيقاف', closed: 'الشخصيات مش شغالة هنا لسه' },
};

/** The conversation with one character; mounted per character so each keeps its own talk. */
function Conversation(props: { room: OpenRoom; character: Character; ai: boolean | null }) {
  const conversation = conversationFor(props.room, props.character);
  const { lines, busy } = useConversation(conversation);
  const [draft, setDraft] = useState('');
  const words = labels[props.room.spec.language];
  const log = useRef<HTMLOListElement>(null);
  useEffect(() => {
    log.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [lines]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    void conversation.send(draft);
    setDraft('');
  };
  return (
    <>
      <ol className="dock-log" ref={log} aria-live="polite">
        {lines.map((line) => (
          <li key={line.id} className={`dock-line dock-${line.kind}`} dir="auto">
            {line.text}
          </li>
        ))}
        {busy ? <li className="dock-line dock-thinking">…</li> : null}
      </ol>
      <form className="dock-form" onSubmit={submit}>
        <textarea
          value={draft}
          rows={2}
          maxLength={4000}
          dir="auto"
          disabled={props.ai === false}
          aria-label={`Message ${props.character.name}`}
          placeholder={props.ai === false ? words.closed : `${words.talk} ${props.character.name}`}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) submit(event);
          }}
        />
        {busy ? (
          <button type="button" onClick={() => conversation.stop()}>
            {words.stop}
          </button>
        ) : (
          <button type="submit" disabled={props.ai === false || !draft.trim()}>
            {words.send}
          </button>
        )}
      </form>
    </>
  );
}

export function AgentDock(props: { room: OpenRoom; ai: boolean | null }) {
  const characters = props.room.spec.characters;
  const [active, setActive] = useState(characters[0].id);
  return (
    <aside className="dock" aria-label="Characters">
      {characters.length > 1 ? (
        <div className="dock-tabs" role="tablist">
          {characters.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === active}
              onClick={() => setActive(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      {characters.map((c) => (
        <div key={c.id} className="dock-character" hidden={c.id !== active} role="tabpanel">
          <p className="dock-who">
            <strong>{c.name}</strong> · {c.role}
          </p>
          <Conversation room={props.room} character={c} ai={props.ai} />
        </div>
      ))}
    </aside>
  );
}
