import { useEffect } from 'react';
import type { RoomSpec } from '@experience/room-spec';
import type { RoomWorld } from '@experience/room-runtime';

/** Inner rooms opened from the person's LifeOS goals (the atrium's own doors are compiled). */
export const isGoalRoom = (room: RoomSpec) => room.id.startsWith('g-') && !room.planned;

/**
 * The person's active goals, each a door straight into its room: a title, a hairline of
 * progress and who keeps it company. Shown only once LifeOS has opened them.
 */
export function GoalDoors(props: { rooms: RoomSpec[]; world?: RoomWorld }) {
  useEffect(() => void import('./goal-doors.css'), []);
  if (!props.rooms.length) return null;
  return (
    <nav className="life-goals" aria-label="Your goals">
      <h3>Your goals</h3>
      <ul>
        {props.rooms.map((room) => {
          const value = props.world?.dataAt(room.id)?.goal?.[0]?.values.progress;
          const progress = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : 0;
          const companion = room.characters[0];
          return (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => props.world?.open(room.id)}
                aria-label={`${room.title}, ${progress}%, enter room`}
              >
                <span className="life-goal-title">{room.title}</span>
                <span className="life-goal-line" aria-hidden="true">
                  <span style={{ width: `${progress}%` }} />
                </span>
                <span className="life-goal-meta">
                  {progress}% · with {companion?.name ?? 'a companion'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
