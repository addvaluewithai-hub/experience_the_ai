import type { CSSProperties } from 'react';
import { pulseOf, type RoomSpec } from '@experience/room-spec';
import { wordsFor, type Words } from '../words';
import type { PanelProps } from './types';

/** Places for up to eight rooms around the world, spread evenly, in percent. */
function place(index: number, count: number) {
  if (count === 1) return { left: 50, top: 50 };
  const angle = -Math.PI / 2 + ((index + 0.5) / count) * Math.PI * 2;
  return { left: 50 + Math.cos(angle) * 34, top: 50 + Math.sin(angle) * 32 };
}

function Door(props: {
  room: RoomSpec;
  pulse: number | null;
  open: () => void;
  words: Words;
  style?: CSSProperties;
}) {
  const { words, room } = props;
  const share = props.pulse === null ? null : Math.round(props.pulse * 100);
  const style = {
    ...props.style,
    '--door-accent': room.theme.accent,
    '--pulse': props.pulse ?? 0,
  } as CSSProperties;
  return (
    <button
      type="button"
      className="room-door"
      data-lit={share ? 'true' : undefined}
      data-planned={room.planned || undefined}
      disabled={room.planned}
      style={style}
      aria-label={
        room.planned
          ? `${room.title}: ${words.planned}`
          : `${words.enter}: ${room.title}${share === null ? '' : `, ${share}%`}`
      }
      onClick={props.open}
    >
      <span className="room-door-building" aria-hidden="true">
        <span>{room.icon ?? '🚪'}</span>
      </span>
      <span className="room-door-title">{room.title}</span>
      <span className="room-door-meter">
        {room.planned ? words.planned : share === null ? '' : share ? `${share}%` : words.quiet}
      </span>
    </button>
  );
}

/**
 * The rooms inside this one: as doors in a grid, or as buildings on a 2.5D world. Each is lit
 * by its pulse, so a glance shows which parts are alive and which are waiting.
 */
export function RoomsPanel({ spec, panel, world }: PanelProps) {
  const rooms = spec.rooms ?? [];
  if (!world || !rooms.length) return null;
  const words = wordsFor(spec.language);
  const doors = rooms.map((room) => ({
    room,
    pulse: pulseOf(room, (path) => world.dataAt(path ? `${room.id}/${path}` : room.id)),
  }));
  if (panel.view !== 'world')
    return (
      <div className="room-doors">
        {doors.map(({ room, pulse }) => (
          <Door
            key={room.id}
            room={room}
            pulse={pulse}
            open={() => world.open(room.id)}
            words={words}
          />
        ))}
      </div>
    );
  return (
    <div className="room-world">
      <svg className="room-world-ground" viewBox="0 0 200 120" aria-hidden="true">
        <ellipse cx="100" cy="66" rx="92" ry="44" className="room-world-shadow" />
        <ellipse cx="100" cy="60" rx="92" ry="44" className="room-world-land" />
        <ellipse cx="100" cy="60" rx="34" ry="15" className="room-world-heart" />
      </svg>
      {doors.map(({ room, pulse }, i) => {
        const at = place(i, doors.length);
        return (
          <Door
            key={room.id}
            room={room}
            pulse={pulse}
            open={() => world.open(room.id)}
            words={words}
            style={{ left: `${at.left}%`, top: `${at.top}%` }}
          />
        );
      })}
    </div>
  );
}
