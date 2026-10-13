import { useEffect, useState, useSyncExternalStore } from 'react';
import { validateRoom, type RoomSpec } from '@experience/room-spec';
import { createRoomStore, type CustomPanels, type RoomStore } from '@experience/room-runtime';
import { rooms as registry } from '../../../../rooms';
import { aiAvailable } from '../shared/api';
import { Home } from '../features/home/Home';
import { RoomPage } from '../features/room/RoomPage';

/** A room open in this tab. There are no accounts yet, so its data does not outlive a reload. */
export type OpenRoom = { spec: RoomSpec; store: RoomStore; panels: CustomPanels };

/** Rooms are compiled in; one that fails validation is reported and left out, never guessed. */
function loadRooms(): OpenRoom[] {
  return registry.flatMap((entry) => {
    const result = validateRoom(entry.spec);
    if (!result.ok) {
      console.error('Room left out:', result.errors);
      return [];
    }
    return [{ spec: result.spec, store: createRoomStore(result.spec), panels: entry.panels ?? {} }];
  });
}

function subscribe(listener: () => void) {
  addEventListener('hashchange', listener);
  return () => removeEventListener('hashchange', listener);
}
const currentHash = () => location.hash;

export function App() {
  const hash = useSyncExternalStore(subscribe, currentHash, () => '');
  const [rooms] = useState(loadRooms);
  const [ai, setAi] = useState<boolean | null>(null);
  useEffect(() => {
    void aiAvailable().then(setAi);
  }, []);
  useEffect(() => window.scrollTo(0, 0), [hash]);

  const roomId = /^#\/room\/([a-z0-9-]+)$/.exec(hash)?.[1];
  const room = rooms.find((r) => r.spec.id === roomId);
  if (room) return <RoomPage key={room.spec.id} room={room} ai={ai} />;
  return <Home rooms={rooms} ai={ai} />;
}
