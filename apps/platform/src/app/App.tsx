import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { aiAvailable } from '../shared/api';
import { Home } from '../features/home/Home';
import { RoomPage } from '../features/room/RoomPage';
import { setConversationHost } from '../features/room/conversation';
import { loadRooms, roomHref } from './rooms';

function subscribe(listener: () => void) {
  addEventListener('hashchange', listener);
  return () => removeEventListener('hashchange', listener);
}
const currentHash = () => location.hash;

export function App() {
  const hash = useSyncExternalStore(subscribe, currentHash, () => '');
  const [rooms] = useState(loadRooms);
  const [ai, setAi] = useState<boolean | null>(null);
  const [focus, setFocus] = useState<{ key: string; panel: string }>();
  const timer = useRef(0);
  useEffect(() => {
    void aiAvailable().then(setAi);
  }, []);
  useEffect(() => window.scrollTo(0, 0), [hash]);
  useEffect(() => {
    setConversationHost({
      rooms: rooms.all,
      open: (key) => (location.hash = roomHref(key)),
      focus: (key, panel) => {
        setFocus({ key, panel });
        document
          .getElementById(`panel-${panel}`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setFocus(undefined), 4000);
      },
    });
    return () => clearTimeout(timer.current);
  }, [rooms]);

  const key = /^#\/room\/([a-z0-9/-]+)$/.exec(hash)?.[1];
  const room = key ? rooms.all.get(key) : undefined;
  if (room)
    return (
      <RoomPage
        key={room.key}
        room={room}
        rooms={rooms.all}
        ai={ai}
        focus={focus?.key === room.key ? focus.panel : undefined}
      />
    );
  return <Home rooms={rooms.top} ai={ai} />;
}
