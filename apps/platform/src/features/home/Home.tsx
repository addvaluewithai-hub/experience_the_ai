import type { CSSProperties } from 'react';
import { roomHref, type OpenRoom } from '../../app/rooms';
import { AiNotice } from '../../shared/AiNotice';

export function Home({ rooms, ai }: { rooms: OpenRoom[]; ai: boolean | null }) {
  const real = rooms.filter((r) => !r.example);
  const card = ({ spec }: OpenRoom) => (
    <li key={spec.id}>
      <a
        className="card"
        href={roomHref(spec.id)}
        style={{ '--card-accent': spec.theme.accent } as CSSProperties}
      >
        <span className="card-theme">
          {spec.icon ?? ''} {spec.theme.preset}
        </span>
        <strong lang={spec.language} dir="auto">
          {spec.title}
        </strong>
        <span lang={spec.language} dir="auto">
          {spec.characters.map((c) => `${c.name} · ${c.role}`).join('  /  ')}
        </span>
      </a>
    </li>
  );
  return (
    <main className="app-page">
      <header className="hero">
        <p className="eyebrow">Experience the AI</p>
        <h1>Rooms with live AI characters</h1>
        <p>
          Each room is built for one need: a teacher, coach, CEO, friend or planner who lives there,
          what the room remembers, and how it looks. Characters act on the room through their tools.
        </p>
        <AiNotice ai={ai} />
      </header>
      <section>
        <h2>Rooms</h2>
        {real.length ? (
          <ul className="cards">{real.map(card)}</ul>
        ) : (
          <p className="muted">
            No rooms built yet. Each one is built with its person, room by room.
          </p>
        )}
      </section>
      <section>
        <h2>Engine examples</h2>
        <p className="muted">Synthetic rooms that show what the engine can do; not real rooms.</p>
        <ul className="cards">{rooms.filter((r) => r.example).map(card)}</ul>
      </section>
    </main>
  );
}
