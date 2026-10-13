import type { CSSProperties } from 'react';
import type { OpenRoom } from '../../app/App';
import { AiNotice } from '../../shared/AiNotice';

export function Home({ rooms, ai }: { rooms: OpenRoom[]; ai: boolean | null }) {
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
        <ul className="cards">
          {rooms.map(({ spec }) => (
            <li key={spec.id}>
              <a
                className="card"
                href={`#/room/${spec.id}`}
                style={{ '--card-accent': spec.theme.accent } as CSSProperties}
              >
                <span className="card-theme">{spec.theme.preset}</span>
                <strong lang={spec.language} dir="auto">
                  {spec.title}
                </strong>
                <span lang={spec.language} dir="auto">
                  {spec.characters.map((c) => `${c.name} · ${c.role}`).join('  /  ')}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
